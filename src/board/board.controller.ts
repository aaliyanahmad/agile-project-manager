import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
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
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { BoardService } from './board.service';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Board')
@ApiBearerAuth()
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get('projects/:projectId/board')
  @ApiOperation({ summary: 'Get board grouped tickets for a project' })
  @ApiOkResponse({ description: 'Board data returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiQuery({ name: 'sprintId', required: false, description: 'Sprint UUID to filter board by sprint' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 50)' })
  async getBoard(
    @Param('projectId') projectId: string,
    @Query('sprintId') sprintId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: User,
  ) {
    return this.boardService.getBoardData(projectId, sprintId, user.id, pagination);
  }

  @Patch('tickets/:ticketId/status')
  @ApiOperation({ summary: 'Update ticket status by status ID' })
  @ApiOkResponse({ description: 'Ticket status updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid status or request data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiBody({ type: UpdateTicketStatusDto })
  async updateTicketStatus(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return {
      success: true,
      data: await this.boardService.updateTicketStatus(ticketId, dto.statusId, user.id),
    };
  }
}
