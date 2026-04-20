import { Ticket } from '../../entities/ticket.entity';
import { Status } from '../../entities/status.entity';

/**
 * Represents a ticket in the board view with additional metadata like subtask counts
 */
export class BoardTicketDto {
  id!: string;
  title!: string;
  priority!: string;
  ticketKey!: string;
  description?: string | null;
  statusId!: string;
  parentTicketId?: string | null;
  labels!: Array<{ id: string; name: string; color?: string }>;
  assignees!: Array<{ id: string; email: string; name?: string }>;
  subtaskCounts!: {
    total: number;
    completed: number;
  };

  static fromTicket(ticket: Ticket, subtaskStats: { total: number; completed: number }): BoardTicketDto {
    const dto = new BoardTicketDto();
    dto.id = ticket.id;
    dto.title = ticket.title;
    dto.priority = ticket.priority;
    dto.ticketKey = ticket.ticketKey;
    dto.description = ticket.description;
    dto.statusId = ticket.statusId;
    dto.parentTicketId = ticket.parentTicketId;
    dto.labels = (ticket.labels || []).map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color || undefined,
    }));
    dto.assignees = (ticket.assignees || []).map((assignee) => ({
      id: assignee.id,
      email: assignee.email,
      name: assignee.name,
    }));
    dto.subtaskCounts = subtaskStats;
    return dto;
  }
}
