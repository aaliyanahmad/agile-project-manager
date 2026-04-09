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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { MoveTicketToSprintDto } from './dto/move-ticket-to-sprint.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Tickets')
@ApiBearerAuth()
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

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
  async getBacklog(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.ticketService.getBacklog(projectId, user.id);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get tickets for a project, optionally filtered by sprint' })
  @ApiResponse({ status: 200, description: 'Tickets returned successfully.' })
  @ApiQuery({ name: 'projectId', required: true, description: 'Project UUID' })
  @ApiQuery({ name: 'sprintId', required: false, description: 'Sprint UUID to filter tickets' })
  async getTickets(
    @Query('projectId') projectId: string,
    @Query('sprintId') sprintId?: string,
    @CurrentUser() user?: User,
  ) {
    if (!projectId) {
      throw new Error('projectId query parameter is required');
    }
    return this.ticketService.getTickets(user!.id, projectId, sprintId);
  }

  @Patch('tickets/:ticketId')
  @ApiOperation({ summary: 'Update a ticket' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully.' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiBody({ type: UpdateTicketDto })
  async updateTicket(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketService.updateTicket(ticketId, user.id, dto);
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
