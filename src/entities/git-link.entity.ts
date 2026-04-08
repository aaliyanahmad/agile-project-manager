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
import { GitLinkType } from './enums';

@Entity({ name: 'git_links' })
@Index('idx_git_link_ticket_id', ['ticketId'])
@Index('idx_git_link_external_id', ['externalId'])
export class GitLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'ticket_id' })
  ticketId!: string;

  @Column({ type: 'enum', enum: GitLinkType })
  type!: GitLinkType;

  @Column({ type: 'varchar', length: 255, name: 'external_id' })
  externalId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Ticket, (ticket) => ticket.gitLinks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;
}
