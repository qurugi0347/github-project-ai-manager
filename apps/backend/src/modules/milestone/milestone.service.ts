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
  ): Promise<(Milestone & { taskCount: number; doneCount: number })[]> {
    const milestones = await this.milestoneRepo.find({
      where: { projectId },
      order: { dueDate: 'ASC' },
    });

    if (milestones.length === 0) return [];

    const milestoneIds = milestones.map((m) => m.id);

    // 단일 쿼리로 milestone별 task 카운트 집계 (N+1 방지)
    const counts = await this.taskRepo
      .createQueryBuilder('task')
      .select('task.milestoneId', 'milestoneId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN task.status = :done THEN 1 ELSE 0 END)', 'doneCount')
      .where('task.milestoneId IN (:...milestoneIds)', { milestoneIds })
      .setParameter('done', 'Done')
      .groupBy('task.milestoneId')
      .getRawMany<{ milestoneId: number; total: string; doneCount: string }>();

    const countMap = new Map(
      counts.map((c) => [c.milestoneId, { total: Number(c.total), done: Number(c.doneCount) }]),
    );

    return milestones.map((milestone) => {
      const counts = countMap.get(milestone.id) ?? { total: 0, done: 0 };
      return {
        ...milestone,
        taskCount: counts.total,
        doneCount: counts.done,
      };
    });
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
