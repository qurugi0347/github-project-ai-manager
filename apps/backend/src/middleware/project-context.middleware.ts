import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { RequestWithProject } from '../types/request';
import { ProjectService } from '../modules/project/project.service';

@Injectable()
export class ProjectContextMiddleware implements NestMiddleware {
  constructor(private readonly projectService: ProjectService) {}

  async use(req: RequestWithProject, res: Response, next: NextFunction) {
    const owner = req.headers['x-gpm-owner'] as string;
    const projectNumber = Number(req.headers['x-gpm-project-number']);

    if (!owner || !projectNumber || isNaN(projectNumber)) {
      return next();
    }

    const project = await this.projectService.findByOwnerAndNumber(owner, projectNumber);
    if (!project) {
      res.status(404).json({
        statusCode: 404,
        message: `Project not found: ${owner}/projects/${projectNumber}. Run "gpm init" first.`,
      });
      return;
    }
    req.project = project;
    next();
  }
}
