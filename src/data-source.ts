import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Project } from './entities/project.entity';
import { Sprint } from './entities/sprint.entity';
import { Ticket } from './entities/ticket.entity';
import { Comment } from './entities/comment.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { Status } from './entities/status.entity';
import { Label } from './entities/label.entity';
import { TicketLabels } from './entities/ticket-labels.entity';
import { TicketAssignees } from './entities/ticket-assignees.entity';
import { Attachment } from './entities/attachment.entity';
import { GitLink } from './entities/git-link.entity';
import { Notification } from './entities/notification.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5499', 10),
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_DATABASE || 'db_postgres',
  entities: [User, Workspace, WorkspaceMember, Project, Sprint, Ticket, Comment, ActivityLog, Status, Label, TicketLabels, TicketAssignees, Attachment, GitLink, Notification],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});