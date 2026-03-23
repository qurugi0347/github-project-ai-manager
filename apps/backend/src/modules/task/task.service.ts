import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async findAll(projectId: number): Promise<Task[]> {
    return this.taskRepo.find({
      where: { projectId },
      relations: ['labels'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number, projectId: number): Promise<Task | null> {
    return this.taskRepo.findOne({
      where: { id, projectId },
      relations: ['labels'],
    });
  }

  async create(projectId: number, data: Partial<Task>): Promise<Task> {
    const task = this.taskRepo.create({ ...data, projectId, isDirty: true });
    return this.taskRepo.save(task);
  }

  async update(id: number, projectId: number, data: Partial<Task>): Promise<Task | null> {
    await this.taskRepo.update({ id, projectId }, { ...data, isDirty: true });
    return this.findById(id, projectId);
  }

  async delete(id: number, projectId: number): Promise<boolean> {
    const result = await this.taskRepo.delete({ id, projectId });
    return (result.affected ?? 0) > 0;
  }
}
