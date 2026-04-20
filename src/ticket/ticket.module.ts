import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../entities/ticket.entity';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';
import { Status } from '../entities/status.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../entities/user.entity';
import { Label } from '../entities/label.entity';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { ActivityModule } from '../activity/activity.module';
import { EventsModule } from '../events/events.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Project, Sprint, Status, WorkspaceMember, User, Label]),
    ActivityModule,
    EventsModule,
    SearchModule,
  ],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
