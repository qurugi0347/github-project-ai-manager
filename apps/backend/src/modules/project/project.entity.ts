import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { Task } from '../task/task.entity';
import { Label } from '../label/label.entity';
import { Milestone } from '../milestone/milestone.entity';
import { SyncLog } from '../sync/sync-log.entity';

@Entity('projects')
@Unique(['owner', 'projectNumber'])
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  owner: string;

  @Column({ name: 'owner_type', default: 'organization' })
  ownerType: string;

  @Column({ nullable: true })
  repo: string;

  @Column({ name: 'project_number' })
  projectNumber: number;

  @Column({ name: 'project_url' })
  projectUrl: string;

  @Column({ name: 'github_project_id', nullable: true })
  githubProjectId: string;

  @Column({ name: 'status_options', type: 'simple-json', nullable: true })
  statusOptions: string[] | null;

  @Column({ name: 'status_options_fetched_at', type: 'datetime', nullable: true })
  statusOptionsFetchedAt: Date | null;

  @Column({ unique: true, nullable: true })
  prefix: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @OneToMany(() => Label, (label) => label.project)
  labels: Label[];

  @OneToMany(() => Milestone, (milestone) => milestone.project)
  milestones: Milestone[];

  @OneToMany(() => SyncLog, (syncLog) => syncLog.project)
  syncLogs: SyncLog[];
}
