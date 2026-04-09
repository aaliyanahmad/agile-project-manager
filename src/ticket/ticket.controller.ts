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
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('projects/:projectId/tickets')
  async createTicket(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketService.createTicket(projectId, user.id, dto);
  }

  @Get('tickets')
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
  async updateTicket(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketService.updateTicket(ticketId, user.id, dto);
  }

  @Delete('tickets/:ticketId')
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
