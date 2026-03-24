import { Controller, Post, Req, Get } from '@nestjs/common';
import { Request } from 'express';
import { SyncService, SyncResult } from './sync.service';
import { Project } from '../project/project.entity';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  private getProject(req: Request): Project {
    return (req as any).project;
  }

  @Post('pull')
  async pull(@Req() req: Request): Promise<SyncResult> {
    const project = this.getProject(req);
    return this.syncService.pullSync(project.id);
  }
}
