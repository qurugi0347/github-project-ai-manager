import { Request } from 'express';
import { Project } from '../modules/project/project.entity';

export interface RequestWithProject extends Request {
  project?: Project;
}
