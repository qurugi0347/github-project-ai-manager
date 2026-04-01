import { Controller, Get, Post, Req, Query, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { SyncService, SyncResult } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  private getProjectId(req: Request, queryProjectId?: string): number {
    const project = (req as any).project;
    if (project?.id) return project.id;
    if (queryProjectId) {
      const parsed = Number(queryProjectId);
      if (Number.isNaN(parsed)) throw new BadRequestException('projectId must be a number');
      return parsed;
    }
    throw new BadRequestException('projectId is required');
  }

  @Post('pull')
  async pull(@Req() req: Request, @Query('projectId') projectId?: string): Promise<SyncResult> {
    const resolvedProjectId = this.getProjectId(req, projectId);
    return this.syncService.pullSync(resolvedProjectId);
  }

  @Get('status-options')
  async statusOptions(
    @Req() req: Request,
    @Query('projectId') projectId?: string,
    @Query('force') force?: string,
  ): Promise<string[]> {
    const resolvedProjectId = this.getProjectId(req, projectId);
    return this.syncService.getStatusOptions(resolvedProjectId, force === 'true');
  }
}
