import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../workspace/guards/workspace-member.guard';

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async createProject(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.createProject(workspaceId, dto);
  }

  @Get()
  async getProjectsInWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.projectService.getProjectsInWorkspace(workspaceId);
  }
}