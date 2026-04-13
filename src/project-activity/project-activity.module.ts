import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectActivityController } from './project-activity.controller';
import { ProjectActivityService } from './project-activity.service';
import { ActivityLog } from '../entities/activity-log.entity';
import { Project } from '../entities/project.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityLog, Project, WorkspaceMember]),
  ],
  controllers: [ProjectActivityController],
  providers: [ProjectActivityService],
})
export class ProjectActivityModule {}