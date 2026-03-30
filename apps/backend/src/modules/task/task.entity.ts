import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { Project } from '../project/project.entity';
import { Label } from '../label/label.entity';
import { Milestone } from '../milestone/milestone.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'github_item_id', unique: true, nullable: true })
  githubItemId: string;

  @Column({ name: 'github_content_id', nullable: true })
  githubContentId: string;

  @Column({ name: 'content_type', default: 'DRAFT_ISSUE' })
  contentType: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ default: 'Todo' })
  status: string;

  @Column({ type: 'simple-json', default: '[]' })
  assignees: string[];

  @Column({ nullable: true })
  priority: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'github_created_at', nullable: true })
  githubCreatedAt: Date;

  @Column({ name: 'github_updated_at', nullable: true })
  githubUpdatedAt: Date;

  @Column({ name: 'synced_at', nullable: true })
  syncedAt: Date;

  @Column({ name: 'is_dirty', default: false })
  isDirty: boolean;

  @Column({ name: 'milestone_id', nullable: true })
  milestoneId: number | null;

  @ManyToOne(() => Milestone, { nullable: true })
  @JoinColumn({ name: 'milestone_id' })
  milestone: Milestone;

  @ManyToMany(() => Label)
  @JoinTable({
    name: 'task_labels',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'label_id', referencedColumnName: 'id' },
  })
  labels: Label[];
}
