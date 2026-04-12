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
import { StatusCategory, SprintStatus } from '../entities/enums';

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
  ) {}

  async getBoardData(
    projectId: string,
    sprintId: string | undefined,
    userId: string,
    pagination: PaginationDto,
  ): Promise<{
    success: true;
    data: { todo: Ticket[]; inProgress: Ticket[]; done: Ticket[] };
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 5, 50);
    const skip = (page - 1) * limit;

    let query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.projectId = :projectId', { projectId });

    if (sprintId) {
      query = query.andWhere('ticket.sprintId = :sprintId', { sprintId });
    } else {
      query = query.andWhere('ticket.sprintId IS NULL');
    }

    const [tickets, total] = await query
      .orderBy('ticket.createdAt', 'ASC')
      .leftJoinAndSelect('ticket.status', 'status')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('ticket.assignees', 'assignees')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const board = {
      todo: [] as Ticket[],
      inProgress: [] as Ticket[],
      done: [] as Ticket[],
    };

    for (const ticket of tickets) {
      switch (ticket.status.category) {
        case StatusCategory.TODO:
          board.todo.push(ticket);
          break;
        case StatusCategory.IN_PROGRESS:
          board.inProgress.push(ticket);
          break;
        case StatusCategory.DONE:
          board.done.push(ticket);
          break;
        default:
          board.todo.push(ticket);
      }
    }

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: board,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async updateTicketStatus(
    ticketId: string,
    status: StatusCategory,
    userId: string,
  ): Promise<Ticket> {
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

    const statusEntity = await this.statusRepository.findOne({
      where: { category: status, projectId: ticket.projectId },
    });

    if (!statusEntity) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    ticket.statusId = statusEntity.id;
    await this.ticketRepository.save(ticket);

    const updatedTicket = await this.ticketRepository.findOne({
      where: { id: ticket.id },
      relations: ['status', 'assignees'],
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
