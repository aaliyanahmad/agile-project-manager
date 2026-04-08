import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { Label } from './label.entity';

@Entity({ name: 'ticket_labels' })
@Index('idx_ticket_labels_ticket_id', ['ticketId'])
@Index('idx_ticket_labels_label_id', ['labelId'])
export class TicketLabels {
  @PrimaryColumn('uuid', { name: 'ticket_id' })
  ticketId!: string;

  @PrimaryColumn('uuid', { name: 'label_id' })
  labelId!: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.ticketLabels, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @ManyToOne(() => Label, (label) => label.ticketLabels, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'label_id' })
  label!: Label;
}
