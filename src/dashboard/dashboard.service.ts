import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { Sprint } from '../entities/sprint.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Project } from '../entities/project.entity';
import { SprintStatus, TicketStatus, StatusCategory } from '../entities/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    @InjectRepository(ActivityLog)
    private readonly activityRepository: Repository<ActivityLog>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async getDashboard(projectId: string, userId: string) {
    await this.validateUserInProject(userId, projectId);

    const [backlogCount, activeSprint, overdueCount, recentActivity] = await Promise.all([
      this.getBacklogCount(projectId),
      this.getActiveSprintSummary(projectId),
      this.getOverdueCount(projectId),
      this.getRecentActivity(projectId),
    ]);

    return {
      backlogCount,
      activeSprint,
      overdueCount,
      recentActivity,
    };
  }

  private async validateUserInProject(userId: string, projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['workspaceId'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const membership = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId: project.workspaceId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied: User does not belong to this workspace');
    }
  }

  private async getBacklogCount(projectId: string): Promise<number> {
    return await this.ticketRepository.count({
      where: {
        projectId,
        sprintId: IsNull(),
      },
    });
  }

  private async getActiveSprintSummary(projectId: string) {
    const sprint = await this.sprintRepository.findOne({
      where: {
        projectId,
        status: SprintStatus.ACTIVE,
      },
    });

    if (!sprint) {
      return null;
    }

    const totalTickets = await this.ticketRepository.count({
      where: { sprintId: sprint.id },
    });

    const statusBreakdown = await this.getStatusBreakdown(sprint.id);

    return {
      id: sprint.id,
      name: sprint.name,
      totalTickets,
      statusBreakdown,
    };
  }

  private async getStatusBreakdown(sprintId: string) {
    const result = await this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoin('ticket.status', 'status')
      .select('status.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('ticket.sprintId = :sprintId', { sprintId })
      .groupBy('status.category')
      .getRawMany();

    const breakdown = {
      [StatusCategory.TODO]: 0,
      [StatusCategory.IN_PROGRESS]: 0,
      [StatusCategory.DONE]: 0,
    };

    result.forEach((row) => {
      const category = row.category as StatusCategory;
      breakdown[category] = parseInt(row.count, 10);
    });

    return breakdown;
  }

  private async getOverdueCount(projectId: string): Promise<number> {
    return await this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoin('ticket.status', 'status')
      .where('ticket.projectId = :projectId', { projectId })
      .andWhere('ticket.dueDate < :now', { now: new Date() })
      .andWhere('status.category != :done', { done: StatusCategory.DONE })
      .getCount();
  }

  private async getRecentActivity(projectId: string) {
    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.ticket', 'ticket')
      .leftJoinAndSelect('activity.user', 'user')
      .where('ticket.projectId = :projectId', { projectId })
      .orderBy('activity.createdAt', 'DESC')
      .take(5)
      .getMany();

    return activities.map((activity) => ({
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
  }
}