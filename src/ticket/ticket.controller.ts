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
  @ApiOkResponse({ description: 'Ticket details returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  async getTicketById(
    @Param('id') ticketId: string,
    @CurrentUser() user: User,
  ) {
    return {
      success: true,
      data: await this.ticketService.getTicketById(ticketId, user.id),
    };
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get tickets for a project, optionally filtered by sprint' })
  @ApiResponse({ status: 200, description: 'Tickets returned successfully.' })
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
    return this.ticketService.getTickets(
      user.id,
      query.projectId,
      query.sprintId,
      { page: query.page, limit: query.limit },
    );
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
