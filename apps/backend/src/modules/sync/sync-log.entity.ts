import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Project } from '../project/project.entity';

@Entity('sync_log')
export class SyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, (project) => project.syncLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @CreateDateColumn({ name: 'synced_at' })
  syncedAt: Date;

  @Column()
  direction: string;

  @Column({ name: 'items_synced', default: 0 })
  itemsSynced: number;

  @Column()
  status: string;

  @Column({ name: 'error_message', nullable: true })
  errorMessage: string;
}
