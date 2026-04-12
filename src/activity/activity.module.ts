import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityLog } from '../entities/activity-log.entity';
import { Ticket } from '../entities/ticket.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityLog,
      Ticket,
      WorkspaceMember,
    ]),
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
