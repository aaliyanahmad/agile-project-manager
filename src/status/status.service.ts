import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Status } from '../entities/status.entity';
import { Project } from '../entities/project.entity';
import { Ticket } from '../entities/ticket.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReorderStatusDto } from './dto/reorder-status.dto';

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(Status)
    private readonly statusRepository: Repository<Status>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async getStatuses(projectId: string, userId: string): Promise<Status[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['workspaceId'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    return this.statusRepository.find({
      where: { projectId },
      order: { position: 'ASC' },
    });
  }

  async createStatus(projectId: string, userId: string, dto: CreateStatusDto): Promise<Status> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['workspaceId'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    const lastStatus = await this.statusRepository.findOne({
      where: { projectId },
      order: { position: 'DESC' },
    });

    const position = dto.position !== undefined ? dto.position : Number(lastStatus?.position ?? 0) + 1;

    const status = this.statusRepository.create({
      projectId,
      name: dto.name.trim(),
      category: dto.category,
      position,
    });

    return this.statusRepository.save(status);
  }

  async updateStatus(id: string, userId: string, dto: UpdateStatusDto): Promise<Status> {
    const status = await this.statusRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    await this.validateUserInWorkspace(userId, status.project.workspaceId);

    if (dto.category !== undefined && dto.category !== status.category) {
      const remainingStatuses = await this.statusRepository.count({
        where: {
          projectId: status.projectId,
          category: status.category,
          id: Not(id),
        },
      });

      if (remainingStatuses === 0) {
        throw new BadRequestException(
          `Cannot change category: project must have at least one ${status.category} status`,
        );
      }

      status.category = dto.category;
    }

    if (dto.name !== undefined) {
      status.name = dto.name.trim();
    }

    if (dto.position !== undefined) {
      status.position = dto.position;
    }

    return this.statusRepository.save(status);
  }

  async deleteStatus(id: string, userId: string): Promise<void> {
    const status = await this.statusRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    await this.validateUserInWorkspace(userId, status.project.workspaceId);

    const ticketCount = await this.ticketRepository.count({
      where: { statusId: id },
    });

    if (ticketCount > 0) {
      throw new BadRequestException('Cannot delete a status that has tickets assigned to it');
    }

    const remainingStatuses = await this.statusRepository.count({
      where: {
        projectId: status.projectId,
        category: status.category,
        id: Not(id),
      },
    });

    if (remainingStatuses === 0) {
      throw new BadRequestException(
        `Cannot delete the last ${status.category} status for this project`,
      );
    }

    await this.statusRepository.delete(id);
  }

  async reorderStatus(id: string, userId: string, dto: ReorderStatusDto): Promise<Status> {
    const status = await this.statusRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    await this.validateUserInWorkspace(userId, status.project.workspaceId);

    status.position = dto.newPosition;
    return this.statusRepository.save(status);
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
