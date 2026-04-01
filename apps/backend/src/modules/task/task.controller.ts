import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { TaskService } from './task.service';
import { SyncService } from '../sync/sync.service';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly syncService: SyncService,
  ) {}

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

  @Get()
  async findAll(@Req() req: Request, @Query('projectId') projectId?: string) {
    const resolvedProjectId = this.getProjectId(req, projectId);
    return this.taskService.findAll(resolvedProjectId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId') projectId: string | undefined,
    @Req() req: Request,
  ) {
    const resolvedProjectId = this.getProjectId(req, projectId);
    const task = await this.taskService.findById(id, resolvedProjectId);
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  @Post()
  async create(
    @Body() body: { title: string; body?: string },
    @Query('projectId') projectId: string | undefined,
    @Req() req: Request,
  ) {
    const resolvedProjectId = this.getProjectId(req, projectId);
    return this.syncService.createTaskOnGitHub(resolvedProjectId, body.title, body.body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<{ title: string; body: string; status: string }>,
    @Query('projectId') projectId: string | undefined,
    @Req() req: Request,
  ) {
    const resolvedProjectId = this.getProjectId(req, projectId);
    if (body.status) {
      const task = await this.syncService.updateTaskStatusOnGitHub(resolvedProjectId, id, body.status);
      if (!task) throw new NotFoundException(`Task #${id} not found`);
      return task;
    }
    // title/body 등 로컬 필드 업데이트 (GitHub 반영은 추후)
    const task = await this.taskService.update(id, resolvedProjectId, body);
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId') projectId: string | undefined,
    @Req() req: Request,
  ) {
    const resolvedProjectId = this.getProjectId(req, projectId);
    const deleted = await this.syncService.deleteTaskOnGitHub(resolvedProjectId, id);
    if (!deleted) throw new NotFoundException(`Task #${id} not found`);
    return { deleted: true };
  }
}
