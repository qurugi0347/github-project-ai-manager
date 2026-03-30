import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from './milestone.entity';
import { Task } from '../task/task.entity';

@Injectable()
export class MilestoneService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepo: Repository<Milestone>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async findAllByProject(
    projectId: number,
  ): Promise<(Milestone & { taskCount: { total: number; done: number } })[]> {
    const milestones = await this.milestoneRepo.find({
      where: { projectId },
      order: { dueDate: 'ASC' },
    });

    const result = await Promise.all(
      milestones.map(async (milestone) => {
        const total = await this.taskRepo.count({
          where: { milestoneId: milestone.id },
        });
        const done = await this.taskRepo.count({
          where: { milestoneId: milestone.id, status: 'Done' },
        });
        return { ...milestone, taskCount: { total, done } };
      }),
    );

    return result;
  }

  async findOne(
    id: number,
  ): Promise<(Milestone & { tasks: Task[] }) | null> {
    const milestone = await this.milestoneRepo.findOneBy({ id });
    if (!milestone) return null;

    const tasks = await this.taskRepo.find({
      where: { milestoneId: milestone.id },
      relations: ['labels'],
      order: { createdAt: 'DESC' },
    });

    return { ...milestone, tasks };
  }
}
