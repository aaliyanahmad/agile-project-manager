import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { Project } from '../entities/project.entity';
import { Status } from '../entities/status.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../entities/user.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { SprintStatus, StatusCategory } from '../entities/enums';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../entities/activity-action.enum';
import { BoardTicketDto } from './dto/board-ticket.dto';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Status)
    private readonly statusRepository: Repository<Status>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly activityService: ActivityService,
  ) {}

  async getBoardData(
    projectId: string,
    sprintId: string | undefined,
    userId: string,
    pagination: PaginationDto,
  ): Promise<{
    success: true;
    data: { columns: Array<{ status: Status; tickets: BoardTicketDto[] }> };
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    // Load statuses ordered by position
    const statuses = await this.statusRepository.find({
      where: { projectId },
      order: { position: 'ASC' },
    });

    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 5, 50);
    const skip = (page - 1) * limit;

    // Build base query
    let query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.projectId = :projectId', { projectId });

    if (sprintId) {
      query = query.andWhere('ticket.sprintId = :sprintId', { sprintId });
    } else {
      query = query.andWhere('ticket.sprintId IS NULL');
    }

    // Optimize joins to avoid duplicates: use distinct and count strategy
    const [tickets, total] = await query
      .leftJoinAndSelect('ticket.status', 'status')
      .leftJoinAndSelect('ticket.assignees', 'assignees')
      .leftJoinAndSelect('ticket.labels', 'labels')
      .distinct(true)
      .orderBy('ticket.createdAt', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Compute subtask counts for all fetched tickets
    const subtaskCountsMap = await this.getSubtaskCounts(tickets.map((t) => t.id));

    // Transform tickets to BoardTicketDto with subtask counts
    const boardTickets = tickets.map((ticket) =>
      BoardTicketDto.fromTicket(ticket, subtaskCountsMap[ticket.id] || { total: 0, completed: 0 }),
    );

    // Group tickets by status
    const ticketGroups = boardTickets.reduce(
      (acc, ticket) => {
        if (!acc[ticket.statusId]) {
          acc[ticket.statusId] = [];
        }
        acc[ticket.statusId].push(ticket);
        return acc;
      },
      {} as Record<string, BoardTicketDto[]>,
    );

    // Build columns with all statuses
    const columns = statuses.map((status) => ({
      status,
      tickets: ticketGroups[status.id] || [],
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: { columns },
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Fetch subtask counts for multiple tickets in a single query
   * Returns a map of ticketId -> { total, completed }
   */
  private async getSubtaskCounts(
    ticketIds: string[],
  ): Promise<Record<string, { total: number; completed: number }>> {
    if (ticketIds.length === 0) {
      return {};
    }

    // Get all subtasks and their statuses
    const subtasks = await this.ticketRepository
      .createQueryBuilder('subtask')
      .leftJoinAndSelect('subtask.status', 'status')
      .where('subtask.parentTicketId IN (:...parentIds)', { parentIds: ticketIds })
      .select('subtask.parentTicketId', 'parentTicketId')
      .addSelect('subtask.id', 'id')
      .addSelect('status.category', 'statusCategory')
      .getRawMany();

    // Aggregate counts by parent ticket ID
    const counts: Record<string, { total: number; completed: number }> = {};

    for (const ticketId of ticketIds) {
      counts[ticketId] = { total: 0, completed: 0 };
    }

    for (const subtask of subtasks) {
      const parentId = subtask.parentTicketId;
      if (counts[parentId]) {
        counts[parentId].total += 1;
        if (subtask.statusCategory === 'DONE') {
          counts[parentId].completed += 1;
        }
      }
    }

    return counts;
  }

  async updateTicketStatus(
    ticketId: string,
    statusId: string,
    userId: string,
  ): Promise<Ticket> {
    // Fetch ticket with its current status
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project', 'sprint', 'status', 'assignees', 'labels'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    // Business rule: Cannot modify tickets in completed sprint
    if (ticket.sprint && ticket.sprint.status === SprintStatus.COMPLETED) {
      throw new ForbiddenException('Cannot modify a completed sprint');
    }

    // Fetch new status to validate it belongs to this project
    const statusEntity = await this.statusRepository.findOne({
      where: { id: statusId, projectId: ticket.projectId },
    });

    if (!statusEntity) {
      throw new BadRequestException('Invalid status ID for this project');
    }

    // Store old status for activity logging
    const oldStatusName = ticket.status?.name || 'Unknown';
    const newStatusName = statusEntity.name;

    // Update ticket status
    ticket.statusId = statusEntity.id;
    await this.ticketRepository.save(ticket);

    // Log activity: STATUS_CHANGED
    await this.activityService.log({
      ticketId: ticket.id,
      userId,
      action: ActivityAction.STATUS_CHANGED,
      metadata: {
        field: 'status',
        from: oldStatusName,
        to: newStatusName,
      },
    });

    // Fetch and return updated ticket with all relations
    const updatedTicket = await this.ticketRepository.findOne({
      where: { id: ticket.id },
      relations: ['status', 'assignees', 'labels'],
    });

    if (!updatedTicket) {
      throw new NotFoundException('Ticket not found after update');
    }

    return updatedTicket;
  }

  private async validateUserInWorkspace(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied: User does not belong to this workspace');
    }
  }
}
