import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll() {
    return this.projectService.findAll();
  }

  @Get('by-repo')
  async findByRepo(
    @Query('owner') owner?: string,
    @Query('repo') repo?: string,
  ) {
    if (!owner || !repo) {
      throw new BadRequestException('Both "owner" and "repo" query parameters are required');
    }
    return this.projectService.findByOwnerAndRepo(owner, repo);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException(`Project #${id} not found`);
    return project;
  }
}
