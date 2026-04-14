import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TicketPriority } from './enums';
import { Project } from './project.entity';
import { Sprint } from './sprint.entity';
import { User } from './user.entity';
import { Comment } from './comment.entity';
import { ActivityLog } from './activity-log.entity';
import { Status } from './status.entity';
import { TicketLabels } from './ticket-labels.entity';
import { TicketAssignees } from './ticket-assignees.entity';
import { Attachment } from './attachment.entity';
import { Label } from './label.entity';

@Entity({ name: 'tickets' })
@Index('idx_ticket_project_id', ['projectId'])
@Index('idx_ticket_sprint_id', ['sprintId'])
@Index('idx_ticket_position', ['position'])
@Index('idx_ticket_due_date', ['dueDate'])
@Index('idx_ticket_status_id', ['statusId'])
@Index('idx_ticket_parent_ticket_id', ['parentTicketId'])
@Index('idx_ticket_priority', ['priority'])
@Index('idx_ticket_title', ['title'])
@Index('idx_ticket_ticket_key', ['ticketKey'])
@Index('idx_ticket_description', ['description'])
@Index('idx_ticket_project_status_priority', ['projectId', 'statusId', 'priority'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @Column({ type: 'uuid', name: 'sprint_id', nullable: true })
  sprintId!: string | null;

  @Column({ type: 'varchar', length: 30, name: 'ticket_key' })
  ticketKey!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid', name: 'status_id' })
  statusId!: string;

  @Column({ type: 'enum', enum: TicketPriority })
  priority!: TicketPriority;

  @Column({ type: 'numeric', nullable: true })
  position!: number | null;

  @Column({ type: 'timestamp', name: 'due_date', nullable: true })
  dueDate!: Date | null;

  @Column({ type: 'uuid', name: 'parent_ticket_id', nullable: true })
  parentTicketId!: string | null;

  @Column({ type: 'numeric', name: 'story_points', nullable: true })
  storyPoints!: number | null;

  @Column({ type: 'uuid', name: 'created_by' })
  createdById!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Project, (project) => project.tickets, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => Sprint, (sprint) => sprint.tickets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'sprint_id' })
  sprint!: Sprint | null;

  @ManyToOne(() => Status, (status) => status.tickets, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'status_id' })
  status!: Status;

  @ManyToOne(() => User, (user) => user.createdTickets, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @ManyToMany(() => User, (user) => user.assignedTickets)
  @JoinTable({
    name: 'ticket_assignees',
    joinColumn: { name: 'ticket_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assignees!: User[];

  @ManyToMany(() => Label, (label) => label.tickets)
  @JoinTable({
    name: 'ticket_labels',
    joinColumn: { name: 'ticket_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'label_id', referencedColumnName: 'id' },
  })
  labels!: Label[];

  @ManyToOne(() => Ticket, (ticket) => ticket.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_ticket_id' })
  parentTicket!: Ticket | null;

  @OneToMany(() => Ticket, (ticket) => ticket.parentTicket)
  children!: Ticket[];

  @OneToMany(() => TicketAssignees, (assignment) => assignment.ticket)
  ticketAssignees!: TicketAssignees[];

  @OneToMany(() => TicketLabels, (ticketLabel) => ticketLabel.ticket)
  ticketLabels!: TicketLabels[];

  @OneToMany(() => Attachment, (attachment) => attachment.ticket)
  attachments!: Attachment[];

  @OneToMany(() => Comment, (comment) => comment.ticket)
  comments!: Comment[];

  @OneToMany(() => ActivityLog, (activityLog) => activityLog.ticket)
  activityLogs!: ActivityLog[];
}
