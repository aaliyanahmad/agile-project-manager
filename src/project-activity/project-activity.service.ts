import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { Project } from '../entities/project.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

export interface ProjectActivityItem {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
  };
  ticket: {
    id: string;
    ticketKey: string;
  };
}

export interface ProjectActivityResponse {
  data: ProjectActivityItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

@Injectable()
export class ProjectActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepository: Repository<ActivityLog>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async getProjectActivity(
    projectId: string,
    paginationDto: PaginationDto,
    userId: string,
  ): Promise<ProjectActivityResponse> {
    // Validate project exists and user has access
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'workspaceId'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    // Build query
    const page = paginationDto.page || 1;
    const limit = Math.min(paginationDto.limit || 5, 50);
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoin('activity.ticket', 'ticket')
      .leftJoin('ticket.project', 'project')
      .where('project.id = :projectId', { projectId })
      .getCount();

    // Get paginated results
    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.ticket', 'ticket')
      .leftJoinAndSelect('activity.user', 'user')
      .leftJoin('ticket.project', 'project')
      .where('project.id = :projectId', { projectId })
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const data: ProjectActivityItem[] = activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
      user: {
        id: activity.user.id,
        name: activity.user.name,
      },
      ticket: {
        id: activity.ticket.id,
        ticketKey: activity.ticket.ticketKey,
      },
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
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