import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { TaskService } from './task.service';
import { SyncService } from '../sync/sync.service';
import { Project } from '../project/project.entity';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly syncService: SyncService,
  ) {}

  private getProject(req: Request): Project {
    return (req as any).project;
  }

  @Get()
  async findAll(@Req() req: Request) {
    const project = this.getProject(req);
    return this.taskService.findAll(project.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const project = this.getProject(req);
    const task = await this.taskService.findById(id, project.id);
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  @Post()
  async create(
    @Body() body: { title: string; body?: string },
    @Req() req: Request,
  ) {
    const project = this.getProject(req);
    return this.syncService.createTaskOnGitHub(project.id, body.title, body.body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<{ title: string; body: string; status: string }>,
    @Req() req: Request,
  ) {
    const project = this.getProject(req);
    if (body.status) {
      const task = await this.syncService.updateTaskStatusOnGitHub(project.id, id, body.status);
      if (!task) throw new NotFoundException(`Task #${id} not found`);
      return task;
    }
    // title/body 등 로컬 필드 업데이트 (GitHub 반영은 추후)
    const task = await this.taskService.update(id, project.id, body);
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const project = this.getProject(req);
    const deleted = await this.syncService.deleteTaskOnGitHub(project.id, id);
    if (!deleted) throw new NotFoundException(`Task #${id} not found`);
    return { deleted: true };
  }
}
