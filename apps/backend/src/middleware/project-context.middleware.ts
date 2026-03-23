import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../modules/project/project.service';

@Injectable()
export class ProjectContextMiddleware implements NestMiddleware {
  constructor(private readonly projectService: ProjectService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const owner = req.headers['x-gpm-owner'] as string;
    const projectNumber = Number(req.headers['x-gpm-project-number']);

    if (!owner || !projectNumber || isNaN(projectNumber)) {
      return next();
    }

    const project = await this.projectService.findOrCreate(owner, projectNumber);
    (req as any).project = project;
    next();
  }
}
