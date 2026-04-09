import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Sprint } from '../entities/sprint.entity';
import { Project } from '../entities/project.entity';
import { Ticket } from '../entities/ticket.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { SprintStatus, StatusCategory } from '../entities/enums';

@Injectable()
export class SprintService {
  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly dataSource: DataSource,
  ) {}

  async createSprint(
    projectId: string,
    userId: string,
    dto: CreateSprintDto,
  ): Promise<Sprint> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    const sprintCount = await this.sprintRepository.count({ where: { projectId } });
    const sprint = this.sprintRepository.create({
      projectId,
      name: `Sprint ${sprintCount + 1}`,
      status: SprintStatus.PLANNED,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    return this.sprintRepository.save(sprint);
  }

  async getSprints(projectId: string, userId: string): Promise<Sprint[]> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    return this.sprintRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async startSprint(sprintId: string, userId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['project'],
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.validateUserInWorkspace(userId, sprint.project.workspaceId);

    if (sprint.status !== SprintStatus.PLANNED) {
      throw new BadRequestException('Only planned sprints can be started');
    }

    const activeSprint = await this.sprintRepository.findOne({
      where: { projectId: sprint.projectId, status: SprintStatus.ACTIVE },
    });

    if (activeSprint) {
      throw new BadRequestException('Another active sprint already exists for this project');
    }

    sprint.status = SprintStatus.ACTIVE;
    sprint.startDate = sprint.startDate || new Date();

    return this.sprintRepository.save(sprint);
  }

  async completeSprint(sprintId: string, userId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['project'],
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.validateUserInWorkspace(userId, sprint.project.workspaceId);

    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Only active sprints can be completed');
    }

    return this.dataSource.transaction(async (manager) => {
      const ticketRepo = manager.getRepository(Ticket);
      const sprintRepo = manager.getRepository(Sprint);

      const tickets = await ticketRepo.find({
        where: { sprintId },
        relations: ['status'],
      });

      const incompleteTicketIds = tickets
        .filter((ticket) => ticket.status.category !== StatusCategory.DONE)
        .map((ticket) => ticket.id);

      if (incompleteTicketIds.length > 0) {
        await ticketRepo
          .createQueryBuilder()
          .update(Ticket)
          .set({ sprintId: null })
          .where('id IN (:...ids)', { ids: incompleteTicketIds })
          .execute();
      }

      sprint.status = SprintStatus.COMPLETED;
      return sprintRepo.save(sprint);
    });
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
