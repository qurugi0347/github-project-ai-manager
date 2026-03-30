import { Controller, Get, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll() {
    return this.projectService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException(`Project #${id} not found`);
    return project;
  }
}
