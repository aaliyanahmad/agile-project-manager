import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';
import { Status } from '../entities/status.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../entities/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { MoveTicketToSprintDto } from './dto/move-ticket-to-sprint.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
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

    // Create ticket
    const ticket = this.ticketRepository.create({
      projectId,
      ticketKey,
      title: dto.title,
      description: dto.description || null,
      statusId: todoStatus.id,
      priority: dto.priority || TicketPriority.MEDIUM,
      createdById: userId,
      assignees,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

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
    projectId: string,
    sprintId: string | undefined,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<Ticket>> {
    // Validate project exists and user has access
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 5, 5); // Enforce max 5
    const skip = (page - 1) * limit;

    // Build query
    let query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.projectId = :projectId', { projectId });

    if (sprintId) {
      query = query.andWhere('ticket.sprintId = :sprintId', { sprintId });
    } else {
      // Backlog (no sprint)
      query = query.andWhere('ticket.sprintId IS NULL');
    }

    const [tickets, total] = await query
      .orderBy('ticket.createdAt', 'ASC')
      .leftJoinAndSelect('ticket.status', 'status')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.assignees', 'assignees')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getBacklog(
    projectId: string,
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<Ticket>> {
    return this.getTickets(userId, projectId, undefined, pagination);
  }

  async getTicketById(ticketId: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['status', 'project', 'sprint', 'createdBy', 'assignees'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
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
      relations: ['project', 'sprint'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    // Business rule: Cannot modify tickets in completed sprint
    if (ticket.sprint && ticket.sprint.status === SprintStatus.COMPLETED) {
      throw new ForbiddenException('Cannot modify a completed sprint');
    }
    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

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

    // Save and return
    const updatedTicket = await this.ticketRepository.save(ticket);

    return this.ticketRepository.findOne({
      where: { id: updatedTicket.id },
      relations: ['status', 'project', 'createdBy', 'assignees', 'sprint'],
    }) as Promise<Ticket>;
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

    // Validate user has access to workspace
    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    // Delete ticket
    await this.ticketRepository.delete(ticketId);
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

