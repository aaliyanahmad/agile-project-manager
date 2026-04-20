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
import { Workspace } from './workspace.entity';
import { Sprint } from './sprint.entity';
import { Ticket } from './ticket.entity';

// NOTE: Add this unique index via migration for case-insensitive unique project names per workspace:
// CREATE UNIQUE INDEX unique_project_name_per_workspace
// ON projects (workspace_id, LOWER(TRIM(name)));

@Entity({ name: 'projects' })
@Index('uq_project_key', ['key'], { unique: true })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @Column({ type: 'text', name: 'description'})
  description!: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.projects, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: Workspace;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  key!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Sprint, (sprint) => sprint.project)
  sprints!: Sprint[];

  @OneToMany(() => Ticket, (ticket) => ticket.project)
  tickets!: Ticket[];
}
