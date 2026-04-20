import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { Project } from '../entities/project.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepository: Repository<Label>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async createLabel(projectId: string, userId: string, dto: CreateLabelDto): Promise<Label> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['workspaceId'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    const label = this.labelRepository.create({
      projectId,
      name: dto.name.trim(),
      color: dto.color,
    });

    return this.labelRepository.save(label);
  }

  async getLabels(projectId: string, userId: string): Promise<Label[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['workspaceId'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.validateUserInWorkspace(userId, project.workspaceId);

    return this.labelRepository.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateLabel(id: string, userId: string, dto: UpdateLabelDto): Promise<Label> {
    const label = await this.labelRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    await this.validateUserInWorkspace(userId, label.project.workspaceId);

    if (dto.name !== undefined) {
      label.name = dto.name.trim();
    }

    if (dto.color !== undefined) {
      label.color = dto.color;
    }

    return this.labelRepository.save(label);
  }

  async deleteLabel(id: string, userId: string): Promise<void> {
    const label = await this.labelRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    await this.validateUserInWorkspace(userId, label.project.workspaceId);

    await this.labelRepository.delete(id);
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
