import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from '../documents/document.entity';
import { ReviewAssignment } from './review-assignment.entity';

@Entity({ name: 'document_review_cycles' })
export class ReviewCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, (document) => document.reviewCycles, { eager: true })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @Index()
  @Column({ type: 'timestamptz' })
  dueAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @Column({ length: 40, default: 'offen' })
  status: string;

  @OneToMany(() => ReviewAssignment, (assignment) => assignment.cycle)
  assignments: ReviewAssignment[];
}
