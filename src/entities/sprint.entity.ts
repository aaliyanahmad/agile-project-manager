import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SprintStatus } from './enums';
import { Project } from './project.entity';
import { Ticket } from './ticket.entity';

@Entity({ name: 'sprints' })
@Index('idx_sprint_project_id', ['projectId'])
export class Sprint {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.sprints, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'enum', enum: SprintStatus })
  status!: SprintStatus;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate!: Date | null;

  @Column({ type: 'text', nullable: true })
  goal!: string | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.sprint)
  tickets!: Ticket[];
}
