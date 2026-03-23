import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../project/project.entity';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'github_milestone_id', unique: true, nullable: true })
  githubMilestoneId: string;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, (project) => project.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'due_date', nullable: true })
  dueDate: Date;

  @Column({ default: 'OPEN' })
  state: string;
}
