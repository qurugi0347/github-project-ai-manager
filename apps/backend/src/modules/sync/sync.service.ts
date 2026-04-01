import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../task/task.entity';
import { SyncLog } from './sync-log.entity';
import { GitHubService } from './github.service';
import { ProjectService } from '../project/project.service';
import { Project } from '../project/project.entity';

export interface SyncResult {
  pulled: number;
  created: number;
  updated: number;
  deleted: number;
  projectId: string;
}

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
    private readonly githubService: GitHubService,
    private readonly projectService: ProjectService,
  ) {}

  async pullSync(projectDbId: number): Promise<SyncResult> {
    const project = await this.projectService.findById(projectDbId);
    if (!project) throw new Error(`Project #${projectDbId} not found`);

    const { items, projectId: ghProjectId } = await this.githubService.getAllProjectItems(
      project.owner,
      project.ownerType,
      project.projectNumber,
    );

    // github_project_id 업데이트 (최초 sync 시)
    if (!project.githubProjectId && ghProjectId) {
      project.githubProjectId = ghProjectId;
      await this.projectService.findOrCreate(project.owner, project.projectNumber, {
        projectUrl: project.projectUrl,
        ownerType: project.ownerType,
        repo: project.repo,
      });
      // 직접 업데이트
      await this.taskRepo.manager.getRepository('Project').update(
        { id: project.id },
        { githubProjectId: ghProjectId },
      );
    }

    let created = 0;
    let updated = 0;
    const remoteItemIds: string[] = [];

    for (const item of items) {
      if (!item.content) continue;

      const contentType = item.content.__typename === 'DraftIssue'
        ? 'DRAFT_ISSUE'
        : item.content.__typename === 'PullRequest'
          ? 'PULL_REQUEST'
          : 'ISSUE';

      // Status 필드 추출
      const statusField = item.fieldValues.nodes.find(
        (fv) => fv.field?.name === 'Status' && fv.name,
      );
      const status = statusField?.name || 'No Status';

      // Assignees 추출
      const assignees = item.content.assignees?.nodes.map((a) => a.login) || [];

      // Branch 추출
      const branch = contentType === 'PULL_REQUEST'
        ? item.content.headRefName ?? null
        : item.content.linkedBranches?.nodes?.[0]?.ref?.name ?? null;

      remoteItemIds.push(item.id);

      const existing = await this.taskRepo.findOneBy({
        githubItemId: item.id,
        projectId: project.id,
      });

      if (existing) {
        // UPDATE
        existing.title = item.content.title || existing.title;
        existing.body = item.content.body ?? existing.body;
        existing.status = status;
        existing.contentType = contentType;
        existing.assignees = assignees;
        existing.branch = branch;
        existing.githubUpdatedAt = item.content.updatedAt ? new Date(item.content.updatedAt) : existing.githubUpdatedAt;
        existing.syncedAt = new Date();
        existing.isDirty = false;
        await this.taskRepo.save(existing);
        updated++;
      } else {
        // INSERT
        const task = new Task();
        task.projectId = project.id;
        task.githubItemId = item.id;
        task.contentType = contentType;
        task.title = item.content.title || 'Untitled';
        if (item.content.body) task.body = item.content.body;
        task.status = status;
        task.assignees = assignees;
        task.branch = branch;
        if (item.content.updatedAt) {
          task.githubCreatedAt = new Date(item.content.updatedAt);
          task.githubUpdatedAt = new Date(item.content.updatedAt);
        }
        task.syncedAt = new Date();
        task.isDirty = false;
        await this.taskRepo.save(task);
        created++;
      }
    }

    // 삭제된 항목 처리 (GitHub에 없는 로컬 항목)
    const localTasks = await this.taskRepo.find({
      where: { projectId: project.id },
    });
    let deleted = 0;
    for (const local of localTasks) {
      if (local.githubItemId && !remoteItemIds.includes(local.githubItemId)) {
        await this.taskRepo.remove(local);
        deleted++;
      }
    }

    // sync_log 기록
    const syncLog = this.syncLogRepo.create({
      projectId: project.id,
      direction: 'PULL',
      itemsSynced: created + updated + deleted,
      status: 'SUCCESS',
    });
    await this.syncLogRepo.save(syncLog);

    return {
      pulled: items.length,
      created,
      updated,
      deleted,
      projectId: ghProjectId,
    };
  }

  private async ensureGithubProjectId(project: Project): Promise<string> {
    if (project.githubProjectId) return project.githubProjectId;

    const projectId = await this.githubService.getProjectId(
      project.owner, project.ownerType, project.projectNumber,
    );
    await this.taskRepo.manager.getRepository('Project').update(
      { id: project.id },
      { githubProjectId: projectId },
    );
    project.githubProjectId = projectId;
    return projectId;
  }

  async createTaskOnGitHub(
    projectDbId: number,
    title: string,
    body?: string,
  ): Promise<Task> {
    const project = await this.projectService.findById(projectDbId);
    if (!project) throw new Error(`Project #${projectDbId} not found`);

    const ghProjectId = await this.ensureGithubProjectId(project);
    const { itemId } = await this.githubService.addDraftIssue(ghProjectId, title, body);

    const task = new Task();
    task.projectId = project.id;
    task.githubItemId = itemId;
    task.contentType = 'DRAFT_ISSUE';
    task.title = title;
    if (body) task.body = body;
    task.status = 'Todo';
    task.syncedAt = new Date();
    task.isDirty = false;
    return this.taskRepo.save(task);
  }

  async updateTaskStatusOnGitHub(
    projectDbId: number,
    taskId: number,
    status: string,
  ): Promise<Task | null> {
    const project = await this.projectService.findById(projectDbId);
    if (!project) throw new Error(`Project #${projectDbId} not found`);

    const task = await this.taskRepo.findOneBy({ id: taskId, projectId: project.id });
    if (!task || !task.githubItemId) throw new Error(`Task #${taskId} not found or not synced`);

    const ghProjectId = await this.ensureGithubProjectId(project);
    const { statusFieldId, statusOptions } = await this.githubService.getProjectFields(
      project.owner, project.ownerType, project.projectNumber,
    );

    const option = statusOptions.find((o) => o.name === status);
    if (!option) {
      throw new Error(`Status "${status}" not found. Available: ${statusOptions.map((o) => o.name).join(', ')}`);
    }

    await this.githubService.updateFieldValue(ghProjectId, task.githubItemId, statusFieldId, option.id);

    task.status = status;
    task.syncedAt = new Date();
    return this.taskRepo.save(task);
  }

  async getStatusOptions(projectDbId: number, force = false): Promise<string[]> {
    const project = await this.projectService.findById(projectDbId);
    if (!project) throw new Error(`Project #${projectDbId} not found`);

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const isFresh = project.statusOptions?.length
      && project.statusOptionsFetchedAt
      && Date.now() - new Date(project.statusOptionsFetchedAt).getTime() < ONE_DAY;

    if (!force && isFresh) {
      return project.statusOptions!;
    }

    const { statusOptions } = await this.githubService.getProjectFields(
      project.owner, project.ownerType, project.projectNumber,
    );
    const names = statusOptions.map((o) => o.name);

    project.statusOptions = names;
    project.statusOptionsFetchedAt = new Date();
    await this.projectService.save(project);

    return names;
  }

  async deleteTaskOnGitHub(
    projectDbId: number,
    taskId: number,
  ): Promise<boolean> {
    const project = await this.projectService.findById(projectDbId);
    if (!project) throw new Error(`Project #${projectDbId} not found`);

    const task = await this.taskRepo.findOneBy({ id: taskId, projectId: project.id });
    if (!task) return false;

    if (task.githubItemId) {
      const ghProjectId = await this.ensureGithubProjectId(project);
      await this.githubService.deleteItem(ghProjectId, task.githubItemId);
    }

    await this.taskRepo.remove(task);
    return true;
  }
}
