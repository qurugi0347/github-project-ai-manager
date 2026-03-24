import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { LabelModule } from './modules/label/label.module';
import { MilestoneModule } from './modules/milestone/milestone.module';
import { SyncModule } from './modules/sync/sync.module';
import { ProjectContextMiddleware } from './middleware/project-context.middleware';

const gpmDir = join(homedir(), '.gpm');
if (!existsSync(gpmDir)) {
  mkdirSync(gpmDir, { recursive: true });
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: join(gpmDir, 'data.db'),
      autoLoadEntities: true,
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api/*path'],
    }),
    ProjectModule,
    TaskModule,
    LabelModule,
    MilestoneModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ProjectContextMiddleware)
      .forRoutes('*path');
  }
}
