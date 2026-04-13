import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusService } from './status.service';
import { Status } from '../entities/status.entity';
import { Project } from '../entities/project.entity';
import { Ticket } from '../entities/ticket.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { CreateStatusDto } from './dto/create-status.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusCategory } from '../entities/enums';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('StatusService', () => {
  let service: StatusService;
  let statusRepo: Partial<Record<keyof Repository<Status>, jest.Mock>>;
  let projectRepo: Partial<Record<keyof Repository<Project>, jest.Mock>>;
  let ticketRepo: Partial<Record<keyof Repository<Ticket>, jest.Mock>>;
  let workspaceMemberRepo: Partial<Record<keyof Repository<WorkspaceMember>, jest.Mock>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusService,
        {
          provide: getRepositoryToken(Status),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<StatusService>(StatusService);
    statusRepo = module.get(getRepositoryToken(Status));
    projectRepo = module.get(getRepositoryToken(Project));
    ticketRepo = module.get(getRepositoryToken(Ticket));
    workspaceMemberRepo = module.get(getRepositoryToken(WorkspaceMember));
  });

  it('should create a status at the next position when none exists', async () => {
    projectRepo.findOne.mockResolvedValue({ workspaceId: 'workspace-1' });
    workspaceMemberRepo.findOne.mockResolvedValue({});
    statusRepo.findOne.mockResolvedValue(undefined);
    statusRepo.create.mockImplementation((dto) => dto);
    statusRepo.save.mockImplementation(async (status) => ({ id: 'status-1', ...status }));

    const dto: CreateStatusDto = {
      name: 'Custom Todo',
      category: StatusCategory.TODO,
    };

    const result = await service.createStatus('project-1', 'user-1', dto);

    expect(result).toMatchObject({
      projectId: 'project-1',
      name: 'Custom Todo',
      category: StatusCategory.TODO,
      position: 1,
    });
    expect(statusRepo.save).toHaveBeenCalled();
  });

  it('should not delete a status that has tickets assigned', async () => {
    statusRepo.findOne.mockResolvedValue({ id: 'status-1', projectId: 'project-1', category: StatusCategory.TODO, project: { workspaceId: 'workspace-1' } });
    workspaceMemberRepo.findOne.mockResolvedValue({});
    ticketRepo.count.mockResolvedValue(1);

    await expect(service.deleteStatus('status-1', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('should not delete the last status in a category', async () => {
    statusRepo.findOne.mockResolvedValue({ id: 'status-1', projectId: 'project-1', category: StatusCategory.DONE, project: { workspaceId: 'workspace-1' } });
    workspaceMemberRepo.findOne.mockResolvedValue({});
    ticketRepo.count.mockResolvedValue(0);
    statusRepo.count.mockResolvedValue(0);

    await expect(service.deleteStatus('status-1', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when getting statuses for an unknown project', async () => {
    projectRepo.findOne.mockResolvedValue(undefined);
    await expect(service.getStatuses('project-1', 'user-1')).rejects.toThrow(NotFoundException);
  });
});
