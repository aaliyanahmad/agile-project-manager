import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { Ticket } from '../entities/ticket.entity';
import { Project } from '../entities/project.entity';
import { Status } from '../entities/status.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../entities/user.entity';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Project, Status, WorkspaceMember, User]),
    ActivityModule,
  ],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardModule {}
