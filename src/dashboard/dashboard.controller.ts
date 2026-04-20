import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Project dashboard with aggregated data',
    schema: {
      example: {
        backlogCount: 12,
        activeSprint: {
          id: 'uuid',
          name: 'Sprint 1',
          totalTickets: 10,
          statusBreakdown: {
            TODO: 3,
            IN_PROGRESS: 4,
            DONE: 3,
          },
        },
        overdueCount: 2,
        recentActivity: [
          {
            id: 'uuid',
            action: 'STATUS_CHANGED',
            metadata: { from: 'TODO', to: 'IN_PROGRESS' },
            createdAt: '2023-01-01T00:00:00.000Z',
            user: { id: 'uuid', name: 'John Doe' },
            ticket: { id: 'uuid', ticketKey: 'PROJ-1' },
          },
        ],
      },
    },
  })
  async getDashboard(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ) {
    return await this.dashboardService.getDashboard(projectId, user.id);
  }
}