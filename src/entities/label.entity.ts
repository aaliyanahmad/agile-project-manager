import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { TicketLabels } from './ticket-labels.entity';
import { Ticket } from './ticket.entity';

@Entity({ name: 'labels' })
@Index('idx_label_project_id', ['projectId'])
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Project, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @OneToMany(() => TicketLabels, (ticketLabel) => ticketLabel.label)
  ticketLabels!: TicketLabels[];

  @ManyToMany(() => Ticket, (ticket) => ticket.labels)
  tickets!: Ticket[];
}
