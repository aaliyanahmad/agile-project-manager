import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Ticket } from './ticket.entity';
import { StatusCategory } from './enums';

@Entity({ name: 'statuses' })
@Index('idx_status_project_id', ['projectId'])
@Index('idx_status_project_position', ['projectId', 'position'])
export class Status {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'enum', enum: StatusCategory })
  category!: StatusCategory;

  @Column({ type: 'numeric' })
  position!: number;

  @ManyToOne(() => Project, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @OneToMany(() => Ticket, (ticket) => ticket.status)
  tickets!: Ticket[];
}
