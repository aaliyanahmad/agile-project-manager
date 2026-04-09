import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../workspace/guards/workspace-member.guard';

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
@ApiTags('Projects')
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project in a workspace' })
  @ApiResponse({ status: 201, description: 'Project created successfully.' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiBody({ type: CreateProjectDto })
  async createProject(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.createProject(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects in a workspace' })
  @ApiResponse({ status: 200, description: 'Project list returned successfully.' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  async getProjectsInWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.projectService.getProjectsInWorkspace(workspaceId);
  }
}