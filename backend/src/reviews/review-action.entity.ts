import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from '../documents/document.entity';
import { ReviewCycle } from './review-cycle.entity';
import { ReviewAssignment } from './review-assignment.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'document_actions' })
export class ReviewAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, { eager: true })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => ReviewCycle, { eager: true })
  @JoinColumn({ name: 'cycle_id' })
  cycle: ReviewCycle;

  @ManyToOne(() => ReviewAssignment, (assignment) => assignment.actions, { eager: true })
  @JoinColumn({ name: 'assignment_id' })
  assignment: ReviewAssignment;

  @ManyToOne(() => User, (user) => user.actions, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'action_type', length: 40 })
  actionType: string;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;
}
