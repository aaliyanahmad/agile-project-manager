import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Activity')
@ApiBearerAuth()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('tickets/:ticketId/activity')
  @ApiOperation({ summary: 'Get activity logs for a ticket' })
  @ApiParam({
    name: 'ticketId',
    description: 'Ticket UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (starts from 1)',
    required: false,
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page (max 50)',
    required: false,
    type: 'number',
    example: 5,
  })
  @ApiOkResponse({
    description: 'Activity logs retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              ticketId: '550e8400-e29b-41d4-a716-446655440001',
              userId: '550e8400-e29b-41d4-a716-446655440002',
              action: 'STATUS_CHANGED',
              metadata: {
                field: 'status',
                from: 'TODO',
                to: 'IN_PROGRESS',
              },
              createdAt: '2025-01-15T10:00:00Z',
              user: {
                id: '550e8400-e29b-41d4-a716-446655440002',
                name: 'John Doe',
              },
            },
          ],
          total: 1,
          page: 1,
          limit: 5,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  async getActivityLogs(
    @Param('ticketId') ticketId: string,
    @Query(new ValidationPipe({ transform: true, skipMissingProperties: true }))
    paginationDto: PaginationDto,
    @CurrentUser() user: User,
  ) {
    return this.activityService.getActivityLogs(ticketId, user.id, paginationDto);
  }
}
