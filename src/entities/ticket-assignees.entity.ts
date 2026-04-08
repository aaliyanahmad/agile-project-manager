import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';

@Entity({ name: 'ticket_assignees' })
@Index('idx_ticket_assignees_ticket_id', ['ticketId'])
@Index('idx_ticket_assignees_user_id', ['userId'])
export class TicketAssignees {
  @PrimaryColumn('uuid', { name: 'ticket_id' })
  ticketId!: string;

  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.ticketAssignees, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @ManyToOne(() => User, (user) => user.ticketAssignees, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
