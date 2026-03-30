import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Milestone } from './milestone.entity';
import { MilestoneService } from './milestone.service';
import { MilestoneController } from './milestone.controller';
import { Task } from '../task/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Milestone, Task])],
  controllers: [MilestoneController],
  providers: [MilestoneService],
  exports: [MilestoneService, TypeOrmModule],
})
export class MilestoneModule {}
