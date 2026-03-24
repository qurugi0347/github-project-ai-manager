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
    return this.projectRepo.findOneBy({ id });
  }

  async findOrCreate(
    owner: string,
    projectNumber: number,
    extra?: Partial<Pick<Project, 'ownerType' | 'repo' | 'projectUrl'>>,
  ): Promise<Project> {
    const existing = await this.projectRepo.findOneBy({ owner, projectNumber });
    if (existing) {
      if (extra) {
        Object.assign(existing, extra);
        return this.projectRepo.save(existing);
      }
      return existing;
    }

    const project = this.projectRepo.create({
      owner,
      projectNumber,
      projectUrl: extra?.projectUrl ?? '',
      ownerType: extra?.ownerType ?? 'organization',
      repo: extra?.repo ?? undefined,
    });
    return this.projectRepo.save(project);
  }

  async findByOwnerAndNumber(owner: string, projectNumber: number): Promise<Project | null> {
    return this.projectRepo.findOneBy({ owner, projectNumber });
  }
}
