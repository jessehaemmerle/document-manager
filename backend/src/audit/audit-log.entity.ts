import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.audits, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Index()
  @Column({ length: 60 })
  actionType: string;

  @Index()
  @Column({ length: 60 })
  entityType: string;

  @Column({ length: 120 })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  beforeJson?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  afterJson?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  contextJson?: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
