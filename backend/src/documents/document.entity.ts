import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentType } from '../document-types/document-type.entity';
import { Department } from '../departments/department.entity';
import { User } from '../users/user.entity';
import { ReviewCycle } from '../reviews/review-cycle.entity';
import { ReviewAssignmentStatus } from '../common/enums/app.enums';

@Entity({ name: 'documents' })
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(() => DocumentType, (type) => type.documents, { eager: true })
  @JoinColumn({ name: 'document_type_id' })
  documentType: DocumentType;

  @Column({ name: 'link_url', length: 500 })
  linkUrl: string;

  @Column({ name: 'source_type', length: 30 })
  sourceType: string;

  @ManyToOne(() => Department, (department) => department.documents, { eager: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => User, (user) => user.createdDocuments, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, (user) => user.responsibleDocuments, { eager: true, nullable: true })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser?: User | null;

  @Column({ name: 'review_interval_type', length: 30 })
  reviewIntervalType: string;

  @Column({ name: 'review_interval_days', type: 'int', nullable: true })
  reviewIntervalDays?: number | null;

  @Index()
  @Column({ name: 'next_review_at', type: 'timestamptz', nullable: true })
  nextReviewAt?: Date | null;

  @Column({ name: 'multi_stage_approval_enabled', default: false })
  multiStageApprovalEnabled: boolean;

  @Column({ name: 'comment_required_on_revision', default: true })
  commentRequiredOnRevision: boolean;

  @Column({ name: 'comment_required_on_deactivation', default: true })
  commentRequiredOnDeactivation: boolean;

  @Column({ name: 'escalation_after_hours', type: 'int', default: 48 })
  escalationAfterHours: number;

  @Column({ name: 'reminder_after_hours', type: 'int', default: 24 })
  reminderAfterHours: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  approvalStages: Array<{ stageNumber: number; roleCode: string; label: string }>;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'text', nullable: true })
  removalComment?: string | null;

  @Column({ type: 'varchar', length: 40, default: ReviewAssignmentStatus.OPEN })
  currentStatus: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ReviewCycle, (cycle) => cycle.document)
  reviewCycles: ReviewCycle[];
}
