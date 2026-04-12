import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<Project | null> {
    return this.projectRepo.findOneBy({ id })
      .then((project) => project ? this.ensurePrefix(project) : null);
  }

  async findOrCreate(
    owner: string,
    projectNumber: number,
    extra?: Partial<Pick<Project, 'ownerType' | 'repo' | 'projectUrl' | 'alias'>>,
  ): Promise<Project> {
    const existing = await this.projectRepo.findOneBy({ owner, projectNumber });
    if (existing) {
      const updates: Partial<Project> = {};
      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          if (value !== undefined && (existing as any)[key] !== value) {
            (updates as any)[key] = value;
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        Object.assign(existing, updates);
        return this.projectRepo.save(existing)
          .then((saved) => this.ensurePrefix(saved));
      }
      return this.ensurePrefix(existing);
    }

    const prefix = await this.generatePrefix(extra?.repo ?? null, owner);
    const project = this.projectRepo.create({
      owner,
      projectNumber,
      projectUrl: extra?.projectUrl ?? '',
      ownerType: extra?.ownerType ?? 'organization',
      repo: extra?.repo ?? undefined,
      alias: extra?.alias ?? null,
      prefix,
    });
    return this.projectRepo.save(project);
  }

  async findByOwnerAndNumber(owner: string, projectNumber: number): Promise<Project | null> {
    return this.projectRepo.findOneBy({ owner, projectNumber })
      .then((project) => project ? this.ensurePrefix(project) : null);
  }

  async findByOwnerAndRepo(owner: string, repo: string): Promise<Project[]> {
    return this.projectRepo.find({
      where: { owner, repo },
      order: { createdAt: 'DESC' },
    });
  }

  async save(project: Project): Promise<Project> {
    return this.projectRepo.save(project);
  }

  private async ensurePrefix(project: Project): Promise<Project> {
    if (project.prefix) return project;
    project.prefix = await this.generatePrefix(project.repo, project.owner);
    return this.projectRepo.save(project);
  }

  private async generatePrefix(repo: string | null, owner: string): Promise<string> {
    const candidate = repo
      ? this.extractAbbreviation(repo)
      : owner.substring(0, 3).toUpperCase();

    const isUnique = await this.projectRepo.findOneBy({ prefix: candidate })
      .then((found) => !found);
    if (isUnique) return candidate;

    const MAX_RETRIES = 5;
    for (let i = 0; i < MAX_RETRIES; i++) {
      const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
      const withSuffix = `${candidate}${suffix}`;
      const isDuplicate = await this.projectRepo.findOneBy({ prefix: withSuffix })
        .then((found) => !!found);
      if (!isDuplicate) return withSuffix;
    }

    return this.generateRandomPrefix();
  }

  private extractAbbreviation(repo: string): string {
    const words = repo.split(/[-_]/);
    const abbreviation = words.map((w) => w.charAt(0).toUpperCase()).join('');
    if (abbreviation.length >= 2) return abbreviation;
    return repo.substring(0, 3).toUpperCase();
  }

  private async generateRandomPrefix(depth = 0): Promise<string> {
    if (depth >= 10) {
      return `P${Date.now().toString(36).slice(-5).toUpperCase()}`;
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let prefix = '';
    for (let i = 0; i < 6; i++) {
      prefix += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const isDuplicate = await this.projectRepo.findOneBy({ prefix })
      .then((found) => !!found);
    if (isDuplicate) return this.generateRandomPrefix(depth + 1);
    return prefix;
  }
}
