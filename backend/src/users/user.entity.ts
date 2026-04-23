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
import { Department } from '../departments/department.entity';
import { Document } from '../documents/document.entity';
import { ReviewAssignment } from '../reviews/review-assignment.entity';
import { ReviewAction } from '../reviews/review-action.entity';
import { Comment } from '../reviews/comment.entity';
import { Notification } from '../notifications/notification.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { Role } from './role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80 })
  firstName: string;

  @Column({ length: 80 })
  lastName: string;

  @Index({ unique: true })
  @Column({ length: 190 })
  email: string;

  @Index({ unique: true })
  @Column({ length: 80 })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Department, (department) => department.users, { eager: true, nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deactivatedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Document, (document) => document.createdBy)
  createdDocuments: Document[];

  @OneToMany(() => Document, (document) => document.responsibleUser)
  responsibleDocuments: Document[];

  @OneToMany(() => ReviewAssignment, (assignment) => assignment.user)
  assignments: ReviewAssignment[];

  @OneToMany(() => ReviewAction, (action) => action.user)
  actions: ReviewAction[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => AuditLog, (audit) => audit.user)
  audits: AuditLog[];
}
