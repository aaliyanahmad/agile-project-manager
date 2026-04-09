import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Status } from '../entities/status.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { StatusCategory } from '../entities/enums';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Status)
    private readonly statusRepository: Repository<Status>,
  ) {}

  async createProject(
    workspaceId: string,
    dto: CreateProjectDto,
  ): Promise<{ success: true; data: Project }> {
    const trimmedName = dto.name.trim();

    // Check for duplicate name in workspace (case-insensitive, trimmed)
    const existingProject = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.workspaceId = :workspaceId', { workspaceId })
      .andWhere('LOWER(TRIM(project.name)) = LOWER(:name)', { name: trimmedName })
      .getOne();

    if (existingProject) {
      throw new BadRequestException('Project with this name already exists in this workspace');
    }

    const key = await this.generateProjectKey(trimmedName);

    const project = this.projectRepository.create({
      workspaceId,
      name: trimmedName,
      key,
    });

    try {
      const savedProject = await this.projectRepository.save(project);
      await this.createDefaultStatuses(savedProject.id);
      return {
        success: true,
        data: savedProject,
      };
    } catch (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new BadRequestException('Project with this name already exists in this workspace');
      }
      throw error;
    }
  }

  async getProjectsInWorkspace(workspaceId: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      select: ['id', 'name', 'key', 'createdAt'],
    });
  }

  private async generateProjectKey(name: string): Promise<string> {
    // Normalize: remove spaces, numbers, and special characters, uppercase
    const normalized = name.replace(/[^a-zA-Z]/g, '').toUpperCase();

    // Take first 4 characters, or less if shorter
    const base = normalized.substring(0, 4);

    if (base.length < 1) {
      throw new BadRequestException('Project name must contain at least one letter');
    }

    // Query existing keys that start with base
    const existingKeys = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.key')
      .where('project.key LIKE :pattern', { pattern: `${base}%` })
      .getRawMany();

    const keys = existingKeys.map(row => row.project_key);

    // Find the highest suffix
    let maxSuffix = -1;
    for (const key of keys) {
      if (key === base) {
        maxSuffix = Math.max(maxSuffix, 0);
      } else if (key.startsWith(base)) {
        const suffixStr = key.substring(base.length);
        if (suffixStr && /^\d+$/.test(suffixStr)) {
          const num = parseInt(suffixStr, 10);
          maxSuffix = Math.max(maxSuffix, num);
        }
      }
    }

    // Generate new key
    const nextSuffix = maxSuffix + 1;
    const newKey = nextSuffix === 0 ? base : `${base}${nextSuffix}`;

    return newKey;
  }

  private async createDefaultStatuses(projectId: string): Promise<void> {
    // Check if statuses already exist for this project (safety check)
    const existingStatuses = await this.statusRepository.count({
      where: { projectId },
    });

    if (existingStatuses > 0) {
      return; // Skip creation if statuses already exist
    }

    // Create default statuses
    const defaultStatuses = [
      {
        projectId,
        name: 'Todo',
        category: StatusCategory.TODO,
        position: 1,
      },
      {
        projectId,
        name: 'In Progress',
        category: StatusCategory.IN_PROGRESS,
        position: 2,
      },
      {
        projectId,
        name: 'Done',
        category: StatusCategory.DONE,
        position: 3,
      },
    ];

    const statusEntities = this.statusRepository.create(defaultStatuses);
    await this.statusRepository.save(statusEntities);
  }
}