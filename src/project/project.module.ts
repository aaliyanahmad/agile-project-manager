import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project, WorkspaceMember]), WorkspaceModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}