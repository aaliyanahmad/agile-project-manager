import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { WorkspaceMemberRole } from '../entities/enums';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<{ success: true; data: { workspace: Workspace; role: WorkspaceMemberRole } }> {
    const existingWorkspace = await this.workspaceRepository.findOne({
      where: {
        ownerId: userId,
        name: dto.name,
      },
    });

    if (existingWorkspace) {
      throw new BadRequestException('Workspace name must be unique for the current user');
    }

    const workspace = this.workspaceRepository.create({
      name: dto.name,
      ownerId: userId,
    });
    const savedWorkspace = await this.workspaceRepository.save(workspace);

    const member = this.workspaceMemberRepository.create({
      workspaceId: savedWorkspace.id,
      userId,
      role: WorkspaceMemberRole.ADMIN,
    });
    await this.workspaceMemberRepository.save(member);

    return {
      success: true,
      data: {
        workspace: savedWorkspace,
        role: WorkspaceMemberRole.ADMIN,
      },
    };
  }

  async getUserWorkspaces(userId: string): Promise<{
    success: true;
    data: Array<{ id: string; name: string; role: WorkspaceMemberRole; createdAt: Date }>;
  }> {
    const members = await this.workspaceMemberRepository.find({
      where: { userId },
      relations: ['workspace'],
    });

    const workspaces = members.map((member) => ({
      id: member.workspace.id,
      name: member.workspace.name,
      role: member.role,
      createdAt: member.workspace.createdAt,
    }));

    return {
      success: true,
      data: workspaces,
    };
  }

  async addMember(
    workspaceId: string,
    userId: string,
    dto: AddMemberDto,
  ): Promise<{ success: true; data: { message: string } }> {
    // Check if workspace exists
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if requester is admin
    const requesterMember = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });
    if (!requesterMember || requesterMember.role !== WorkspaceMemberRole.ADMIN) {
      throw new ForbiddenException('Only admins can add members');
    }

    // Check if user is already a member
    const existingMember = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId: dto.userId },
    });
    if (existingMember) {
      throw new BadRequestException('User is already a member of this workspace');
    }

    // Add member
    const member = this.workspaceMemberRepository.create({
      workspaceId,
      userId: dto.userId,
      role: dto.role,
    });
    await this.workspaceMemberRepository.save(member);

    return {
      success: true,
      data: { message: 'Member added successfully' },
    };
  }
}