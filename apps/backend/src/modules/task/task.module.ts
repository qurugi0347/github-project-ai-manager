import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), SyncModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
