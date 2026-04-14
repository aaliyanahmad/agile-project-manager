import { CreateSubtaskDto } from './dto/create-subtask.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { GetTicketsQueryDto } from './dto/get-tickets-query.dto';
import { MoveTicketToSprintDto } from './dto/move-ticket-to-sprint.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ReorderTicketDto } from './dto/reorder-ticket.dto';
import { BulkTicketActionDto, BulkActionResponse } from './dto/bulk-ticket-action.dto';
import { AssignLabelsDto } from './dto/assign-labels.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Tickets')
@ApiBearerAuth()
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}
  @Post('tickets/:parentId/subtasks')
  @ApiOperation({ summary: 'Create a subtask for a ticket' })
  @ApiResponse({ status: 201, description: 'Subtask created successfully.' })
  @ApiParam({ name: 'parentId', description: 'Parent ticket UUID' })
  @ApiBody({ type: CreateSubtaskDto })
  async createSubtask(
    @Param('parentId') parentId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.ticketService.createSubtask(parentId, user.id, dto);
  }

  @Get('tickets/:id/subtasks')
  @ApiOperation({ summary: 'Get all subtasks for a ticket' })
  @ApiResponse({ status: 200, description: 'List of subtasks returned successfully.' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  async getSubtasks(
    @Param('id') ticketId: string,
    @CurrentUser() user: User,
  ) {
    return this.ticketService.getSubtasks(ticketId, user.id);
  }

  @Post('projects/:projectId/tickets')
  @ApiOperation({ summary: 'Create a ticket in a project' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully.' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiBody({ type: CreateTicketDto })
  async createTicket(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketService.createTicket(projectId, user.id, dto);
  }

  @Get('projects/:projectId/backlog')
  @ApiOperation({ summary: 'Get backlog tickets for a project' })
  @ApiResponse({ status: 200, description: 'Backlog returned successfully.' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 50)' })
  async getBacklog(
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketService.getBacklog(projectId, user.id, pagination);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get full ticket details by ID' })
  @ApiOkResponse({
    description: 'Ticket details returned successfully.',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          projectId: '550e8400-e29b-41d4-a716-446655440001',
          ticketKey: 'PROJ-1',
          title: 'Implement login feature',
          description: 'Add JWT-based authentication',
          statusId: '550e8400-e29b-41d4-a716-446655440002',
          priority: 'HIGH',
          assignees: [
            {
              id: '550e8400-e29b-41d4-a716-446655440003',
              name: 'John Doe',
            },
          ],
          createdBy: {
            id: '550e8400-e29b-41d4-a716-446655440003',
            name: 'John Doe',
          },
          labels: [],
          attachments: [
            {
              id: '550e8400-e29b-41d4-a716-446655440004',
              fileUrl: '/uploads/design-mockup.png',
              fileName: 'design-mockup.png',
              fileSize: 245876,
              uploadedBy: {
                id: '550e8400-e29b-41d4-a716-446655440003',
                name: 'John Doe',
              },
              createdAt: '2024-01-15T10:30:00Z',
            },
          ],
          subtasks: [],
          subtaskCompletion: {
            total: 0,
            completed: 0,
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  async getTicketById(
    @Param('id') ticketId: string,
    @CurrentUser() user: User,
  ) {
    return {
      success: true,
      data: await this.ticketService.getTicketDetailWithSubtasks(ticketId, user.id),
    };
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get tickets with advanced filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Tickets returned successfully.' })
  @ApiQuery({ name: 'projectId', description: 'Project UUID', required: true, example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @ApiQuery({ name: 'sprintId', description: 'Sprint UUID to filter tickets', required: false, example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc' })
  @ApiQuery({ name: 'statusId', description: 'Status UUID to filter tickets', required: false, example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' })
  @ApiQuery({ name: 'statusCategory', description: 'Status category to filter tickets', required: false, enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'TODO' })
  @ApiQuery({ name: 'priority', description: 'Priority level to filter tickets', required: false, enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'HIGH' })
  @ApiQuery({ name: 'assigneeId', description: 'Assignee UUID to filter tickets', required: false, example: 'c3d4e5f6-7a8b-9c0d-1e2f-345678901bcd' })
  @ApiQuery({ name: 'dueDateFrom', description: 'Due date from (ISO 8601 format)', required: false, example: '2026-04-01T00:00:00Z' })
  @ApiQuery({ name: 'dueDateTo', description: 'Due date to (ISO 8601 format)', required: false, example: '2026-04-30T23:59:59Z' })
  @ApiQuery({ name: 'page', description: 'Page number (starts from 1)', required: false, example: 1 })
  @ApiQuery({ name: 'limit', description: 'Items per page (max 50)', required: false, example: 5 })
  @ApiQuery({ name: 'sortBy', description: 'Sort field', required: false, enum: ['dueDate', 'priority', 'updatedAt', 'position'], example: 'dueDate' })
  @ApiQuery({ name: 'order', description: 'Sort order', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  @ApiQuery({ name: 'labelIds', description: 'Comma-separated label UUIDs to filter tickets', required: false })
  async getTickets(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ) query: GetTicketsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketService.getTickets(user.id, query);
  }

  @Patch('tickets/:ticketId')
  @ApiOperation({ summary: 'Update a ticket' })
  @ApiOkResponse({ description: 'Ticket updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid data or status' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiBody({ type: UpdateTicketDto })
  async updateTicket(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTicketDto,
  ) {
    return {
      success: true,
      data: await this.ticketService.updateTicket(ticketId, user.id, dto),
    };
  }

  @Patch('tickets/:ticketId/move-to-sprint')
  @ApiOperation({ summary: 'Move a ticket into a sprint' })
  @ApiResponse({ status: 200, description: 'Ticket moved to sprint successfully.' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiBody({ type: MoveTicketToSprintDto })
  async moveTicketToSprint(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: MoveTicketToSprintDto,
  ) {
    return this.ticketService.moveTicketToSprint(ticketId, user.id, dto);
  }

  @Patch('tickets/:ticketId/remove-from-sprint')
  @ApiOperation({ summary: 'Remove a ticket from its sprint back to backlog' })
  @ApiResponse({ status: 200, description: 'Ticket removed from sprint successfully.' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  async removeTicketFromSprint(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
  ) {
    return this.ticketService.removeTicketFromSprint(ticketId, user.id);
  }

  @Patch('tickets/:ticketId/labels')
  @ApiOperation({ summary: 'Replace labels on a ticket' })
  @ApiOkResponse({ description: 'Labels updated successfully.' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiBody({ type: AssignLabelsDto })
  async assignLabels(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: AssignLabelsDto,
  ) {
    return {
      success: true,
      data: await this.ticketService.assignLabelsToTicket(ticketId, user.id, dto),
    };
  }

  @Patch('tickets/:ticketId/reorder')
  @ApiOperation({ summary: 'Reorder a backlog ticket (gap-based ordering)' })
  @ApiOkResponse({ description: 'Ticket reordered successfully.' })
  @ApiBadRequestResponse({ description: 'Only backlog tickets can be reordered' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiBody({ type: ReorderTicketDto })
  async reorderTicket(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: ReorderTicketDto,
  ) {
    return {
      success: true,
      data: await this.ticketService.reorderTicket(ticketId, user.id, dto.newPosition),
    };
  }

  @Patch('projects/:projectId/tickets/bulk')
  @ApiOperation({ summary: 'Apply bulk action to multiple tickets (assign, priority, move to sprint/backlog)' })
  @ApiOkResponse({ description: 'Bulk action applied successfully.', type: BulkActionResponse })
  @ApiBadRequestResponse({ description: 'Invalid tickets, action, or payload' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Project or sprint not found' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiBody({ 
    type: BulkTicketActionDto,
    description: 'Bulk action request. Action types: ASSIGN, PRIORITY, MOVE_TO_SPRINT, MOVE_TO_BACKLOG',
    examples: {
      assign: {
        summary: 'Assign multiple tickets to a user',
        value: {
          ticketIds: ['uuid1', 'uuid2', 'uuid3'],
          action: 'ASSIGN',
          payload: { assigneeId: 'user-uuid' }
        }
      },
      priority: {
        summary: 'Change priority for multiple tickets',
        value: {
          ticketIds: ['uuid1', 'uuid2'],
          action: 'PRIORITY',
          payload: { priority: 'HIGH' }
        }
      },
      moveToSprint: {
        summary: 'Move multiple tickets to a sprint',
        value: {
          ticketIds: ['uuid1', 'uuid2', 'uuid3'],
          action: 'MOVE_TO_SPRINT',
          payload: { sprintId: 'sprint-uuid' }
        }
      },
      moveToBacklog: {
        summary: 'Move multiple tickets back to backlog',
        value: {
          ticketIds: ['uuid1', 'uuid2'],
          action: 'MOVE_TO_BACKLOG',
          payload: {}
        }
      }
    }
  })
  async bulkUpdateTickets(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: BulkTicketActionDto,
  ): Promise<BulkActionResponse> {
    return this.ticketService.bulkUpdateTickets(dto.ticketIds, projectId, user.id, dto);
  }

  @Delete('tickets/:ticketId')
  @ApiOperation({ summary: 'Delete a ticket' })
  @ApiResponse({ status: 200, description: 'Ticket deleted successfully.' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  async deleteTicket(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
  ) {
    await this.ticketService.deleteTicket(ticketId, user.id);
    return {
      success: true,
      message: 'Ticket deleted successfully',
    };
  }
}
