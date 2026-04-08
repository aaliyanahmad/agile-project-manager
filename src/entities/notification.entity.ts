import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { NotificationType } from './enums';

@Entity({ name: 'notifications' })
@Index('idx_notification_user_id', ['userId'])
@Index('idx_notification_is_read', ['isRead'])
@Index('idx_notification_created_at', ['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 50, name: 'reference_type' })
  referenceType!: string;

  @Column({ type: 'uuid', name: 'reference_id' })
  referenceId!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'boolean', name: 'is_read', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
