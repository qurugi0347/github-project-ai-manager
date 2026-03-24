import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncLog } from './sync-log.entity';
import { Task } from '../task/task.entity';
import { GitHubService } from './github.service';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SyncLog, Task])],
  controllers: [SyncController],
  providers: [GitHubService, SyncService],
  exports: [SyncService, GitHubService],
})
export class SyncModule {}
