import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { Attachment } from '../entities/attachment.entity';
import { Ticket } from '../entities/ticket.entity';
import { Comment } from '../entities/comment.entity';
import { User } from '../entities/user.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Project } from '../entities/project.entity';
import { UploadModule } from '../upload/upload.module';
import { ActivityModule } from '../activity/activity.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attachment,
      Ticket,
      Comment,
      User,
      WorkspaceMember,
      Project,
    ]),
    UploadModule,
    ActivityModule,
    EventsModule,
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
