import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from '../documents/document.entity';
import { ReviewCycle } from './review-cycle.entity';
import { ReviewAssignment } from './review-assignment.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'comments' })
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, { eager: true })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => ReviewCycle, { eager: true, nullable: true })
  @JoinColumn({ name: 'cycle_id' })
  cycle?: ReviewCycle | null;

  @ManyToOne(() => ReviewAssignment, (assignment) => assignment.comments, { eager: true, nullable: true })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: ReviewAssignment | null;

  @ManyToOne(() => User, (user) => user.comments, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
