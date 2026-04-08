import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { Comment } from './comment.entity';
import { User } from './user.entity';

@Entity({ name: 'attachments' })
@Index('idx_attachment_ticket_id', ['ticketId'])
@Index('idx_attachment_comment_id', ['commentId'])
@Index('idx_attachment_uploaded_by', ['uploadedById'])
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'ticket_id', nullable: true })
  ticketId!: string | null;

  @Column({ type: 'uuid', name: 'comment_id', nullable: true })
  commentId!: string | null;

  @Column({ type: 'text', name: 'file_url' })
  fileUrl!: string;

  @Column({ type: 'varchar', length: 255, name: 'file_name' })
  fileName!: string;

  @Column({ type: 'integer', name: 'file_size' })
  fileSize!: number;

  @Column({ type: 'uuid', name: 'uploaded_by' })
  uploadedById!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Ticket, (ticket) => ticket.attachments, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket | null;

  @ManyToOne(() => Comment, (comment) => comment.attachments, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comment_id' })
  comment!: Comment | null;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy!: User;
}
