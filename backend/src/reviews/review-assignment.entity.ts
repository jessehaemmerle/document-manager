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
import { ReviewCycle } from './review-cycle.entity';
import { User } from '../users/user.entity';
import { ReviewAction } from './review-action.entity';
import { Comment } from './comment.entity';

@Entity({ name: 'document_review_assignments' })
export class ReviewAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ReviewCycle, (cycle) => cycle.assignments, { eager: true })
  @JoinColumn({ name: 'cycle_id' })
  cycle: ReviewCycle;

  @ManyToOne(() => User, (user) => user.assignments, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ type: 'int' })
  stageNumber: number;

  @Index()
  @Column({ length: 40, default: 'offen' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  assignedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  remindedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  escalatedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ReviewAction, (action) => action.assignment)
  actions: ReviewAction[];

  @OneToMany(() => Comment, (comment) => comment.assignment)
  comments: Comment[];
}
