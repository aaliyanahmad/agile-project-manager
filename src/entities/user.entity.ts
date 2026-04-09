import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { Ticket } from './ticket.entity';
import { Comment } from './comment.entity';
import { ActivityLog } from './activity-log.entity';
import { TicketAssignees } from './ticket-assignees.entity';
import { UserTheme } from './enums';

@Entity({ name: 'users' })
@Index('uq_user_email', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'enum', enum: UserTheme, default: UserTheme.DARK })
  theme!: UserTheme;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Workspace, (workspace) => workspace.owner)
  ownedWorkspaces!: Workspace[];

  @OneToMany(() => WorkspaceMember, (member) => member.user)
  workspaceMemberships!: WorkspaceMember[];

  @OneToMany(() => Ticket, (ticket) => ticket.createdBy)
  createdTickets!: Ticket[];

  @ManyToMany(() => Ticket, (ticket) => ticket.assignees)
  assignedTickets!: Ticket[];

  @OneToMany(() => TicketAssignees, (assignment) => assignment.user)
  ticketAssignees!: TicketAssignees[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments!: Comment[];

  @OneToMany(() => ActivityLog, (activityLog) => activityLog.user)
  activityLogs!: ActivityLog[];
}
