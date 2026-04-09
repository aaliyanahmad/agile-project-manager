import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, WorkspaceMember])],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceMemberGuard],
  exports: [WorkspaceService, WorkspaceMemberGuard],
})
export class WorkspaceModule {}