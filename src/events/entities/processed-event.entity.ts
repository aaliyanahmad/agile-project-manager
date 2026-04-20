import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ProcessedEvent Entity
 * Tracks all processed events to ensure idempotency
 * Prevents duplicate processing of the same event
 * Tracks retry attempts for reliability monitoring
 */
@Entity('processed_events')
@Index('idx_processed_event_id', ['eventId'], { unique: true })
export class ProcessedEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: false })
  eventId: string;

  @Column('varchar', { nullable: true })
  eventType?: string;

  @Column('int', { default: 0 })
  retryCount: number;

  @Column('text', { nullable: true })
  lastError?: string;

  @Column('boolean', { default: false })
  isProcessed: boolean;

  @CreateDateColumn()
  processedAt: Date;

  @UpdateDateColumn()
  lastAttemptAt: Date;
}
