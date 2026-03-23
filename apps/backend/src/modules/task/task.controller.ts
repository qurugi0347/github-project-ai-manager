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
import { Project } from '../project/project.entity';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

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
  async create(@Body() body: { title: string; body?: string; status?: string }, @Req() req: Request) {
    const project = this.getProject(req);
    return this.taskService.create(project.id, body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<{ title: string; body: string; status: string }>,
    @Req() req: Request,
  ) {
    const project = this.getProject(req);
    const task = await this.taskService.update(id, project.id, body);
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const project = this.getProject(req);
    const deleted = await this.taskService.delete(id, project.id);
    if (!deleted) throw new NotFoundException(`Task #${id} not found`);
    return { deleted: true };
  }
}
