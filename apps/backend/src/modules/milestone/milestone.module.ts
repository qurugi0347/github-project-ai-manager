import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Milestone } from './milestone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Milestone])],
  exports: [TypeOrmModule],
})
export class MilestoneModule {}
