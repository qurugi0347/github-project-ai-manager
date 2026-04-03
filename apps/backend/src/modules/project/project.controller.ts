import { Controller, Get, Param, ParseIntPipe, NotFoundException, Req } from '@nestjs/common';
import { Request } from 'express';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll() {
    return this.projectService.findAll();
  }

  @Get('current')
  async findCurrent(@Req() req: Request) {
    const project = (req as any).project;
    if (!project) throw new NotFoundException('No project context. Send X-GPM-Owner and X-GPM-Project-Number headers.');
    return project;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException(`Project #${id} not found`);
    return project;
  }
}
