import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';
import { Status } from '../entities/status.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../entities/user.entity';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../entities/activity-action.enum';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { MoveTicketToSprintDto } from './dto/move-ticket-to-sprint.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { BulkTicketActionDto, BulkActionType, BulkActionResponse } from './dto/bulk-ticket-action.dto';
import { GetTicketsQueryDto } from './dto/get-tickets-query.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { TicketPriority, TicketStatus, SprintStatus, StatusCategory } from '../entities/enums';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    @InjectRepository(Status)
    private readonly statusRepository: Repository<Status>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly activityService: ActivityService,
    private readonly dataSource: DataSource,
  ) {}

  async createTicket(
    projectId: string,
    userId: string,
    dto: CreateTicketDto,
  ): Promise<{ success: true; data: Ticket }> {
    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate user belongs to project's workspace
    await this.validateUserInWorkspace(userId, project.workspaceId);

    // Validate assignees if provided and belong to workspace
    let assignees = [] as User[];
    if (dto.assigneeIds && dto.assigneeIds.length > 0) {
      for (const assigneeId of dto.assigneeIds) {
        await this.validateAssigneeInWorkspace(assigneeId, project.workspaceId);
      }

      assignees = await this.userRepository.find({
        where: { id: In(dto.assigneeIds) },
      });

      if (assignees.length !== dto.assigneeIds.length) {
        throw new BadRequestException('One or more assignees were not found');
      }
    }

    // Get default status (TODO)
    const todoStatus = await this.statusRepository.findOne({
      where: { category: StatusCategory.TODO, projectId },
    });

    if (!todoStatus) {
      throw new BadRequestException('Default status (TODO) not configured');
    }

    // Generate ticket key
    const ticketKey = await this.generateTicketKey(projectId, project.key);

    // Get max position in backlog - all new tickets start in backlog
    const maxPositionResult = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('MAX(ticket.position)', 'max_position')
      .where('ticket.projectId = :projectId', { projectId })
      .andWhere('ticket.sprintId IS NULL')
      .getRawOne();

    const maxPosition = maxPositionResult?.max_position ? Number(maxPositionResult.max_position) : 0;
    const position = maxPosition + 1;

    // Create ticket
    const ticket = this.ticketRepository.create({
      projectId,
      ticketKey,
      title: dto.title,
      description: dto.description || null,
      statusId: todoStatus.id,
      priority: dto.priority || TicketPriority.MEDIUM,
      sprintId: null,
      position,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdById: userId,
      assignees,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    await this.activityService.log({
      ticketId: savedTicket.id,
      userId,
      action: ActivityAction.TICKET_CREATED,
      metadata: {},
    });

    // Return ticket with related data populated
    const ticketWithRelations = await this.ticketRepository.findOne({
      where: { id: savedTicket.id },
      relations: ['status', 'project', 'createdBy', 'assignees'],
    });

    return {
      success: true,
      data: ticketWithRelations!,
    };
  }

  async getTickets(
    userId: string,
    query: GetTicketsQueryDto,
  ): Promise<PaginatedResponse<Ticket>> {
    // Validate project exists and user has access
    const project = await this.projectRepository.findOne({
      where: { id: query.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 5, 50);
    const skip = (page - 1) * limit;

    // Build query with all filters
    let qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.status', 'status')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('ticket.sprint', 'sprint')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.assignees', 'assignees');

    // Always filter by project
    qb = qb.where('ticket.projectId = :projectId', { projectId: query.projectId });

    // Apply filters conditionally
    if (query.sprintId) {
      qb = qb.andWhere('ticket.sprintId = :sprintId', { sprintId: query.sprintId });
    }

    if (query.statusId) {
      qb = qb.andWhere('ticket.statusId = :statusId', { statusId: query.statusId });
    }

    if (query.statusCategory) {
      qb = qb.andWhere('status.category = :statusCategory', { statusCategory: query.statusCategory });
    }

    if (query.priority) {
      qb = qb.andWhere('ticket.priority = :priority', { priority: query.priority });
    }

    if (query.assigneeId) {
      qb = qb.andWhere('assignees.id = :assigneeId', { assigneeId: query.assigneeId });
    }

    if (query.dueDateFrom) {
      qb = qb.andWhere('ticket.dueDate >= :dueDateFrom', { dueDateFrom: new Date(query.dueDateFrom) });
    }

    if (query.dueDateTo) {
      qb = qb.andWhere('ticket.dueDate <= :dueDateTo', { dueDateTo: new Date(query.dueDateTo) });
    }

    // Apply sorting
    if (query.sortBy) {
      // Custom sorting requested
      const sortOrder = query.order || 'DESC';

      if (query.sortBy === 'dueDate') {
        // NULL dueDate values should go last
        qb = qb.orderBy('ticket.dueDate IS NULL', 'ASC')
               .addOrderBy(`ticket.${query.sortBy}`, sortOrder as 'ASC' | 'DESC');
      } else {
        qb = qb.orderBy(`ticket.${query.sortBy}`, sortOrder as 'ASC' | 'DESC');
      }
    } else {
      // Default sorting
      if (query.sprintId) {
        // Sprint tickets - order by updatedAt DESC
        qb = qb.orderBy('ticket.updatedAt', 'DESC');
      } else {
        // Backlog (no sprint) - order by position ASC
        qb = qb.orderBy('ticket.position', 'ASC');
      }
    }

    // Apply pagination
    qb = qb.skip(skip).take(limit);

    const [tickets, total] = await qb.getManyAndCount();

    return {
      success: true,
      data: {
        items: tickets,
        total,
        page,
        limit,
      },
    };
  }

  async getBacklog(
    projectId: string,
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<Ticket>> {
    const query: GetTicketsQueryDto = {
      projectId,
      page: pagination.page,
      limit: pagination.limit,
    };
    return this.getTickets(userId, query);
  }

  async getTicketById(ticketId: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('ticket.sprint', 'sprint')
      .leftJoinAndSelect('ticket.status', 'status')
      .leftJoinAndSelect('ticket.assignees', 'assignees')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .where('ticket.id = :ticketId', { ticketId })
      .getOne();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.project) {
      throw new NotFoundException('Ticket project not found');
    }

    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    return ticket;
  }

  async moveTicketToSprint(
    ticketId: string,
    userId: string,
    dto: MoveTicketToSprintDto,
  ): Promise<Ticket> {
    // First, find the ticket with minimal relations to validate permissions
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project', 'sprint'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.project) {
      throw new NotFoundException('Ticket project not found');
    }

    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    if (ticket.sprint && ticket.sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot move tickets from a completed sprint');
    }

    const sprint = await this.sprintRepository.findOne({
      where: { id: dto.sprintId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (sprint.projectId !== ticket.projectId) {
      throw new BadRequestException('Sprint belongs to a different project');
    }

    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot move ticket to a completed sprint');
    }

    // Use query builder to update directly
    await this.ticketRepository
      .createQueryBuilder()
      .update(Ticket)
      .set({ sprintId: dto.sprintId })
      .where('id = :id', { id: ticketId })
      .execute();

    // Reload the ticket with all relations
    const updatedTicket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['status', 'project', 'createdBy', 'assignees', 'sprint'],
    });

    if (!updatedTicket) {
      throw new NotFoundException('Ticket not found after update');
    }

    if (ticket.sprintId !== dto.sprintId) {
      await this.activityService.log({
        ticketId: updatedTicket.id,
        userId,
        action: ActivityAction.MOVED_TO_SPRINT,
        metadata: {
          field: 'sprint',
          from: ticket.sprintId,
          to: dto.sprintId,
        },
      });
    }

    return updatedTicket;
  }

  async removeTicketFromSprint(ticketId: string, userId: string): Promise<Ticket> {
    // First, find the ticket with minimal relations to validate permissions
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project', 'sprint'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.project) {
      throw new NotFoundException('Ticket project not found');
    }

    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    if (!ticket.sprintId) {
      throw new BadRequestException('Ticket is already in the backlog');
    }

    if (ticket.sprint && ticket.sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot remove tickets from a completed sprint');
    }

    // Use query builder to update directly
    await this.ticketRepository
      .createQueryBuilder()
      .update(Ticket)
      .set({ sprintId: null })
      .where('id = :id', { id: ticketId })
      .execute();

    // Reload the ticket with all relations
    const updatedTicket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['status', 'project', 'createdBy', 'assignees', 'sprint'],
    });

    if (!updatedTicket) {
      throw new NotFoundException('Ticket not found after update');
    }

    console.log('About to log activity');

    const activityResult = await this.activityService.log({
      ticketId: updatedTicket.id,
      userId,
      action: ActivityAction.REMOVED_FROM_SPRINT,
      metadata: {
        field: 'sprint',
        from: ticket.sprintId,
        to: null,
      },
    });

    console.log('Activity log result:', activityResult);

    return updatedTicket;
  }

  async updateTicket(
    ticketId: string,
    userId: string,
    dto: UpdateTicketDto,
  ): Promise<Ticket> {
    // Validate ticket exists
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project', 'sprint', 'assignees', 'status'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.project) {
      throw new NotFoundException('Ticket project not found');
    }

    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    // Business rule: Cannot modify tickets in completed sprint
    if (ticket.sprint && ticket.sprint.status === SprintStatus.COMPLETED) {
      throw new ForbiddenException('Cannot modify a completed sprint');
    }

    const oldTitle = ticket.title;
    const oldDescription = ticket.description;
    const oldStatusCategory = ticket.status?.category ?? null;
    const oldPriority = ticket.priority;
    const oldSprintId = ticket.sprintId ?? null;
    const oldDueDate = ticket.dueDate;
    const oldAssigneeIds = (ticket.assignees || []).map((assignee) => assignee.id).sort();

    // Validate assignee if provided
    if (dto.assigneeIds !== undefined) {
      if (dto.assigneeIds.length > 0) {
        for (const assigneeId of dto.assigneeIds) {
          await this.validateAssigneeInWorkspace(assigneeId, ticket.project.workspaceId);
        }

        const assignees = await this.userRepository.find({
          where: { id: In(dto.assigneeIds) },
        });

        if (assignees.length !== dto.assigneeIds.length) {
          throw new BadRequestException('One or more assignees were not found');
        }

        ticket.assignees = assignees;
      } else {
        ticket.assignees = [];
      }
    }

    // Validate status if provided
    if (dto.status) {
      const statusExists = await this.statusRepository.findOne({
        where: { category: dto.status, projectId: ticket.projectId },
      });

      if (!statusExists) {
        throw new BadRequestException(`Invalid status: ${dto.status}`);
      }

      ticket.statusId = statusExists.id;
    }

    // Update allowed fields
    if (dto.title) ticket.title = dto.title;
    if (dto.description !== undefined) ticket.description = dto.description;
    if (dto.priority) ticket.priority = dto.priority;
    if (dto.dueDate !== undefined) {
      ticket.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    // Save ticket and return
    const updatedTicket = await this.ticketRepository.save(ticket);

    const finalTicket = await this.ticketRepository.findOne({
      where: { id: updatedTicket.id },
      relations: ['status', 'project', 'createdBy', 'assignees', 'sprint'],
    });

    if (!finalTicket) {
      throw new NotFoundException('Ticket not found after update');
    }

    if (dto.title !== undefined && dto.title !== oldTitle) {
      await this.activityService.log({
        ticketId: finalTicket.id,
        userId,
        action: ActivityAction.TITLE_UPDATED,
        metadata: {
          field: 'title',
          from: oldTitle,
          to: dto.title,
        },
      });
    }

    if (dto.description !== undefined && dto.description !== oldDescription) {
      await this.activityService.log({
        ticketId: finalTicket.id,
        userId,
        action: ActivityAction.DESCRIPTION_UPDATED,
        metadata: {
          field: 'description',
          from: oldDescription,
          to: dto.description,
        },
      });
    }

    if (dto.status !== undefined && dto.status !== oldStatusCategory) {
      await this.activityService.log({
        ticketId: finalTicket.id,
        userId,
        action: ActivityAction.STATUS_CHANGED,
        metadata: {
          field: 'status',
          from: oldStatusCategory,
          to: dto.status,
        },
      });
    }

    if (dto.priority !== undefined && dto.priority !== oldPriority) {
      await this.activityService.log({
        ticketId: finalTicket.id,
        userId,
        action: ActivityAction.PRIORITY_CHANGED,
        metadata: {
          field: 'priority',
          from: oldPriority,
          to: dto.priority,
        },
      });
    }

    if (dto.dueDate !== undefined) {
      const newDueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      const oldDueDateStr = oldDueDate ? oldDueDate.toISOString() : null;
      const newDueDateStr = newDueDate ? newDueDate.toISOString() : null;

      if (oldDueDateStr !== newDueDateStr) {
        await this.activityService.log({
          ticketId: finalTicket.id,
          userId,
          action: ActivityAction.DUE_DATE_CHANGED,
          metadata: {
            field: 'dueDate',
            from: oldDueDateStr,
            to: newDueDateStr,
          },
        });
      }
    }

    if (dto.assigneeIds !== undefined) {
      const newAssigneeIds = [...dto.assigneeIds].sort();
      const assigneeChanged =
        newAssigneeIds.length !== oldAssigneeIds.length ||
        newAssigneeIds.some((id, index) => id !== oldAssigneeIds[index]);

      if (assigneeChanged) {
        await this.activityService.log({
          ticketId: finalTicket.id,
          userId,
          action: ActivityAction.ASSIGNEE_CHANGED,
          metadata: {
            field: 'assignee',
            from: oldAssigneeIds,
            to: newAssigneeIds,
          },
        });
      }
    }

    if (finalTicket.sprintId !== oldSprintId) {
      await this.activityService.log({
        ticketId: finalTicket.id,
        userId,
        action: ActivityAction.SPRINT_ASSIGNMENT_CHANGED,
        metadata: {
          field: 'sprint',
          from: oldSprintId,
          to: finalTicket.sprintId,
        },
      });
    }

    return finalTicket;
  }

  async deleteTicket(ticketId: string, userId: string): Promise<void> {
    // Validate ticket exists
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.project) {
      throw new NotFoundException('Ticket project not found');
    }

    // Validate user has access to workspace
    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    // Delete ticket
    await this.ticketRepository.delete(ticketId);
  }

  async reorderTicket(
    ticketId: string,
    userId: string,
    newPosition: number,
  ): Promise<Ticket> {
    // Validate ticket exists
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project', 'sprint'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.project) {
      throw new NotFoundException('Ticket project not found');
    }

    // Validate user has access to workspace
    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    // Validate that ticket is in backlog (sprint_id = NULL)
    if (ticket.sprintId !== null) {
      throw new BadRequestException('Only backlog tickets (not assigned to a sprint) can be reordered');
    }

    // Store old position for activity log
    const oldPosition = ticket.position;

    // Update position
    ticket.position = newPosition;
    const updatedTicket = await this.ticketRepository.save(ticket);

    // Reload with all relations
    const finalTicket = await this.ticketRepository.findOne({
      where: { id: updatedTicket.id },
      relations: ['status', 'project', 'createdBy', 'assignees', 'sprint'],
    });

    if (!finalTicket) {
      throw new NotFoundException('Ticket not found after reorder');
    }

    // Log activity
    await this.activityService.log({
      ticketId: finalTicket.id,
      userId,
      action: ActivityAction.TICKET_REORDERED,
      metadata: {
        field: 'position',
        from: oldPosition,
        to: newPosition,
      },
    });

    return finalTicket;
  }

  async bulkUpdateTickets(
    ticketIds: string[],
    projectId: string,
    userId: string,
    dto: BulkTicketActionDto,
  ): Promise<BulkActionResponse> {
    // Validate action
    if (!dto.action || !Object.values(BulkActionType).includes(dto.action)) {
      throw new BadRequestException('Invalid action type');
    }

    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate user has access to workspace
    await this.validateUserInWorkspace(userId, project.workspaceId);

    // Validate action-specific payload
    switch (dto.action) {
      case BulkActionType.ASSIGN:
        if (!dto.payload.assigneeId) {
          throw new BadRequestException('assigneeId is required for ASSIGN action');
        }
        // Validate assignee exists and belongs to workspace
        const assignee = await this.userRepository.findOne({
          where: { id: dto.payload.assigneeId },
        });
        if (!assignee) {
          throw new BadRequestException('Assignee not found');
        }
        await this.validateAssigneeInWorkspace(dto.payload.assigneeId, project.workspaceId);
        break;

      case BulkActionType.PRIORITY:
        if (!dto.payload.priority) {
          throw new BadRequestException('priority is required for PRIORITY action');
        }
        if (!Object.values(TicketPriority).includes(dto.payload.priority)) {
          throw new BadRequestException('Invalid priority value');
        }
        break;

      case BulkActionType.MOVE_TO_SPRINT:
        if (!dto.payload.sprintId) {
          throw new BadRequestException('sprintId is required for MOVE_TO_SPRINT action');
        }
        const sprint = await this.sprintRepository.findOne({
          where: { id: dto.payload.sprintId },
        });
        if (!sprint) {
          throw new NotFoundException('Sprint not found');
        }
        if (sprint.projectId !== projectId) {
          throw new BadRequestException('Sprint belongs to a different project');
        }
        if (sprint.status === SprintStatus.COMPLETED) {
          throw new BadRequestException('Cannot move tickets to a completed sprint');
        }
        break;

      case BulkActionType.MOVE_TO_BACKLOG:
        // No validation needed for payload
        break;
    }

    // Fetch all tickets to validate they exist and belong to the project
    const tickets = await this.ticketRepository.find({
      where: {
        id: In(ticketIds),
        projectId,
      },
      relations: ['sprint', 'assignees'],
    });

    if (tickets.length === 0) {
      throw new BadRequestException('No valid tickets found in this project');
    }

    if (tickets.length !== ticketIds.length) {
      throw new BadRequestException('Some tickets do not belong to this project or do not exist');
    }

    // Check if any ticket belongs to a completed sprint (for sprint movement only)
    if (dto.action === BulkActionType.MOVE_TO_SPRINT || dto.action === BulkActionType.MOVE_TO_BACKLOG) {
      const completedSprintTickets = tickets.filter(
        (t) => t.sprint && t.sprint.status === SprintStatus.COMPLETED,
      );
      if (completedSprintTickets.length > 0) {
        throw new BadRequestException(
          'Cannot move tickets from a completed sprint',
        );
      }
    }

    // Use transaction to apply changes
    let updatedCount = 0;
    await this.dataSource.transaction(async (manager) => {
      const ticketRepo = manager.getRepository(Ticket);

      for (const ticket of tickets) {
        const oldState = {
          assigneeIds: ticket.assignees ? ticket.assignees.map((a) => a.id).sort() : [],
          priority: ticket.priority,
          sprintId: ticket.sprintId,
        };

        switch (dto.action) {
          case BulkActionType.ASSIGN:
            // Update assignees
            const newAssignee = await manager.getRepository(User).findOne({
              where: { id: dto.payload.assigneeId },
            });
            if (newAssignee) {
              ticket.assignees = [newAssignee];
              await ticketRepo.save(ticket);
              updatedCount++;

              // Log activity
              await this.activityService.log({
                ticketId: ticket.id,
                userId,
                action: ActivityAction.ASSIGNEE_CHANGED,
                metadata: {
                  field: 'assignee',
                  from: oldState.assigneeIds,
                  to: [dto.payload.assigneeId],
                },
              });
            }
            break;

          case BulkActionType.PRIORITY:
            if (ticket.priority !== dto.payload.priority) {
              ticket.priority = dto.payload.priority!;
              await ticketRepo.save(ticket);
              updatedCount++;

              // Log activity
              await this.activityService.log({
                ticketId: ticket.id,
                userId,
                action: ActivityAction.PRIORITY_CHANGED,
                metadata: {
                  field: 'priority',
                  from: oldState.priority,
                  to: dto.payload.priority,
                },
              });
            }
            break;

          case BulkActionType.MOVE_TO_SPRINT:
            if (ticket.sprintId !== dto.payload.sprintId) {
              ticket.sprintId = dto.payload.sprintId!;
              await ticketRepo.save(ticket);
              updatedCount++;

              // Log activity
              await this.activityService.log({
                ticketId: ticket.id,
                userId,
                action: ActivityAction.MOVED_TO_SPRINT,
                metadata: {
                  field: 'sprint',
                  from: oldState.sprintId,
                  to: dto.payload.sprintId,
                },
              });
            }
            break;

          case BulkActionType.MOVE_TO_BACKLOG:
            if (ticket.sprintId !== null) {
              ticket.sprintId = null;
              await ticketRepo.save(ticket);
              updatedCount++;

              // Log activity
              await this.activityService.log({
                ticketId: ticket.id,
                userId,
                action: ActivityAction.MOVED_TO_BACKLOG,
                metadata: {
                  field: 'sprint',
                  from: oldState.sprintId,
                  to: null,
                },
              });
            }
            break;
        }
      }
    });

    return {
      success: true,
      updatedCount,
    };
  }

  private async generateTicketKey(projectId: string, projectKey: string): Promise<string> {
    // Count existing tickets for this project
    const count = await this.ticketRepository.count({
      where: { projectId },
    });

    const nextNumber = count + 1;
    return `${projectKey}-${nextNumber}`;
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

  private async validateAssigneeInWorkspace(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId,
      },
    });

    if (!membership) {
      throw new BadRequestException('Assignee must belong to the ticket project workspace');
    }
  }
}

