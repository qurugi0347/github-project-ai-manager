import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../task/task.entity';
import { SyncLog } from './sync-log.entity';
import { GitHubService } from './github.service';
import { ProjectService } from '../project/project.service';

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
}
