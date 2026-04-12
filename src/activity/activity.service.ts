import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { Ticket } from '../entities/ticket.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { ActivityAction } from '../entities/activity-action.enum';

export interface CreateActivityLogParams {
  ticketId: string;
  userId: string;
  action: ActivityAction;
  metadata: Record<string, unknown> | null;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async log(
    params: CreateActivityLogParams,
  ): Promise<ActivityLog | null> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: params.ticketId },
      select: ['id'],
    });

    if (!ticket) {
      return null;
    }

    const activityLog = this.activityLogRepository.create({
      ticketId: params.ticketId,
      userId: params.userId,
      action: params.action,
      metadata: params.metadata,
    });

    return this.activityLogRepository.save(activityLog);
  }

  async getActivityLogs(
    ticketId: string,
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ActivityLog>> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    const page = paginationDto.page || 1;
    const limit = Math.min(paginationDto.limit || 5, 50);
    const skip = (page - 1) * limit;

    const total = await this.activityLogRepository.count({
      where: { ticketId },
    });

    const logs = await this.activityLogRepository.find({
      where: { ticketId },
      relations: ['user'],
      select: {
        id: true,
        ticketId: true,
        userId: true,
        action: true,
        metadata: true,
        createdAt: true,
        user: {
          id: true,
          name: true,
        },
      },
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    return {
      success: true,
      data: {
        items: logs,
        total,
        page,
        limit,
      },
    };
  }

  private async validateUserInWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
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
