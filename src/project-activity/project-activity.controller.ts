import { Controller, Get, Param, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectActivityService, ProjectActivityResponse } from './project-activity.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Projects')
@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
export class ProjectActivityController {
  constructor(private readonly projectActivityService: ProjectActivityService) {}

  @Get('activity')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project activity feed' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (starts from 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 50)', example: 5 })
  @ApiOkResponse({
    description: 'Project activity feed returned successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            action: 'STATUS_CHANGED',
            metadata: { from: 'TODO', to: 'IN_PROGRESS' },
            createdAt: '2023-01-01T00:00:00.000Z',
            user: { id: 'uuid', name: 'John Doe' },
            ticket: { id: 'uuid', ticketKey: 'PROJ-1' },
          },
        ],
        meta: {
          page: 1,
          limit: 5,
          total: 25,
        },
      },
    },
  })
  async getProjectActivity(
    @Param('projectId') projectId: string,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    paginationDto: PaginationDto,
    @CurrentUser() user: { id: string },
  ): Promise<ProjectActivityResponse> {
    return this.projectActivityService.getProjectActivity(projectId, paginationDto, user.id);
  }
}