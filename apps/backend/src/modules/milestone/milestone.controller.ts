import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MilestoneService } from './milestone.service';

@Controller('milestones')
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }
    const parsed = Number(projectId);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('projectId must be a number');
    }
    return this.milestoneService.findAllByProject(parsed);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const milestone = await this.milestoneService.findOne(id);
    if (!milestone) throw new NotFoundException(`Milestone #${id} not found`);
    return milestone;
  }
}
