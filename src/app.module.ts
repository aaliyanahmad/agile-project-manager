import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
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
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ProjectModule } from './project/project.module';
import { TicketModule } from './ticket/ticket.module';
import { SprintModule } from './sprint/sprint.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5499', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [User, Workspace, WorkspaceMember, Project, Sprint, Ticket, Comment, ActivityLog, Status, Label, TicketLabels, TicketAssignees, Attachment, GitLink, Notification],
      autoLoadEntities: true,
      synchronize: false,  // Disabled for production, use migrations
      migrations: ['dist/migrations/*.js'],
      logging: process.env.DB_LOGGING === 'true',
    }),
    
    AuthModule,
    WorkspaceModule,
    ProjectModule,
    TicketModule,
    SprintModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
