import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SprintService } from './sprint.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Sprints')
@ApiBearerAuth()
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Post('projects/:projectId/sprints')
  @ApiOperation({ summary: 'Create a sprint for a project' })
  @ApiResponse({ status: 201, description: 'Sprint created successfully.' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiBody({ type: CreateSprintDto })
  async createSprint(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateSprintDto,
  ) {
    const data = await this.sprintService.createSprint(projectId, user.id, dto);
    return { success: true, data };
  }

  @Get('projects/:projectId/sprints')
  @ApiOperation({ summary: 'List sprints for a project' })
  @ApiResponse({ status: 200, description: 'Sprint list returned successfully.' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 50)' })
  async getSprints(
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: User,
  ) {
    return this.sprintService.getSprints(projectId, user.id, pagination);
  }

  @Patch('sprints/:id')
  @ApiOperation({ summary: 'Update a sprint (goal)' })
  @ApiResponse({ status: 200, description: 'Sprint updated successfully.' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  @ApiBody({ type: UpdateSprintDto })
  async updateSprint(
    @Param('id') sprintId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateSprintDto,
  ) {
    const data = await this.sprintService.updateSprint(sprintId, user.id, dto);
    return { success: true, data };
  }

  @Patch('sprints/:id/start')
  @ApiOperation({ summary: 'Start a planned sprint' })
  @ApiResponse({ status: 200, description: 'Sprint started successfully.' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  async startSprint(
    @Param('id') sprintId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.sprintService.startSprint(sprintId, user.id);
    return { success: true, data };
  }

  @Patch('sprints/:id/complete')
  @ApiOperation({ summary: 'Complete an active sprint' })
  @ApiResponse({ status: 200, description: 'Sprint completed successfully.' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  async completeSprint(
    @Param('id') sprintId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.sprintService.completeSprint(sprintId, user.id);
    return { success: true, data };
  }
}