import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Ticket } from '../entities/ticket.entity';
import { Sprint } from '../entities/sprint.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Project } from '../entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Sprint, ActivityLog, WorkspaceMember, Project]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}