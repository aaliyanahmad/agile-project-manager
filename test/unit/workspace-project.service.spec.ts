import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceService } from '../src/workspace/workspace.service';
import { ProjectService } from '../src/project/project.service';
import { Workspace } from '../src/entities/workspace.entity';
import { WorkspaceMember } from '../src/entities/workspace-member.entity';
import { Project } from '../src/entities/project.entity';
import { Status } from '../src/entities/status.entity';
import { WorkspaceMemberRole, StatusCategory } from '../src/entities/enums';

const mockRepository = () => ({
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('WorkspaceService (Unit)', () => {
  let service: WorkspaceService;
  let workspaceRepository: any;
  let workspaceMemberRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: getRepositoryToken(Workspace),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    workspaceRepository = module.get(getRepositoryToken(Workspace));
    workspaceMemberRepository = module.get(getRepositoryToken(WorkspaceMember));
  });

  describe('createWorkspace', () => {
    it('should create workspace with ADMIN role for creator', async () => {
      const userId = 'user-123';
      const dto = { name: 'My Workspace' };
      const mockWorkspace = { id: 'ws-123', name: dto.name, ownerId: userId };
      const mockMember = {
        workspaceId: 'ws-123',
        userId,
        role: WorkspaceMemberRole.ADMIN,
      };

      workspaceRepository.findOne.mockResolvedValue(null);
      workspaceRepository.create.mockReturnValue(mockWorkspace);
      workspaceRepository.save.mockResolvedValue(mockWorkspace);
      workspaceMemberRepository.create.mockReturnValue(mockMember);
      workspaceMemberRepository.save.mockResolvedValue(mockMember);

      const result = await service.createWorkspace(userId, dto);

      expect(result.success).toBe(true);
      expect(result.data.workspace.name).toBe(dto.name);
      expect(result.data.role).toBe(WorkspaceMemberRole.ADMIN);
    });

    it('should not create duplicate workspace name for same user', async () => {
      const userId = 'user-123';
      const dto = { name: 'My Workspace' };
      const existingWorkspace = { id: 'ws-123', name: dto.name };

      workspaceRepository.findOne.mockResolvedValue(existingWorkspace);

      await expect(service.createWorkspace(userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserWorkspaces', () => {
    it('should return paginated workspaces for user', async () => {
      const userId = 'user-123';
      const mockMembers = [
        {
          workspace: { id: 'ws-1', name: 'Workspace 1' },
          role: WorkspaceMemberRole.ADMIN,
        },
        {
          workspace: { id: 'ws-2', name: 'Workspace 2' },
          role: WorkspaceMemberRole.MEMBER,
        },
      ];

      workspaceMemberRepository.findAndCount.mockResolvedValue([mockMembers, 2]);

      const result = await service.getUserWorkspaces(userId, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('addMember', () => {
    it('should add member to workspace', async () => {
      const workspaceId = 'ws-123';
      const userId = 'admin-user';
      const newUserId = 'new-user';

      workspaceMemberRepository.findOne
        .mockResolvedValueOnce({ role: WorkspaceMemberRole.ADMIN })
        .mockResolvedValueOnce(null);
      workspaceMemberRepository.create.mockReturnValue({
        workspaceId,
        userId: newUserId,
        role: WorkspaceMemberRole.MEMBER,
      });
      workspaceMemberRepository.save.mockResolvedValue({
        workspaceId,
        userId: newUserId,
        role: WorkspaceMemberRole.MEMBER,
      });

      const result = await service.addMember(workspaceId, userId, {
        userId: newUserId,
        role: WorkspaceMemberRole.MEMBER,
      });

      expect(result.success).toBe(true);
    });

    it('should not add member if not ADMIN', async () => {
      const workspaceId = 'ws-123';
      const userId = 'regular-user';

      workspaceMemberRepository.findOne.mockResolvedValue({
        role: WorkspaceMemberRole.MEMBER,
      });

      await expect(
        service.addMember(workspaceId, userId, {
          userId: 'new-user',
          role: WorkspaceMemberRole.MEMBER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

describe('ProjectService (Unit)', () => {
  let service: ProjectService;
  let projectRepository: any;
  let statusRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Status),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get(getRepositoryToken(Project));
    statusRepository = module.get(getRepositoryToken(Status));
  });

  describe('createProject', () => {
    it('should create project with default statuses', async () => {
      const workspaceId = 'ws-123';
      const userId = 'user-123';
      const dto = { name: 'My Project' };

      const mockProject = {
        id: 'proj-123',
        name: dto.name,
        workspaceId,
        key: 'MYPR',
      };

      const mockStatuses = [
        { id: 'status-1', projectId: 'proj-123', name: 'TODO', category: StatusCategory.TODO },
        { id: 'status-2', projectId: 'proj-123', name: 'IN_PROGRESS', category: StatusCategory.IN_PROGRESS },
        { id: 'status-3', projectId: 'proj-123', name: 'DONE', category: StatusCategory.DONE },
      ];

      projectRepository.findOne.mockResolvedValue(null);
      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);
      statusRepository.create.mockReturnValue(mockStatuses);
      statusRepository.save.mockResolvedValue(mockStatuses);

      const result = await service.createProject(workspaceId, userId, dto);

      expect(result.success).toBe(true);
      expect(result.data.project.name).toBe(dto.name);
    });

    it('should generate unique project key', async () => {
      const workspaceId = 'ws-123';
      const userId = 'user-123';
      const dto = { name: 'My Project' };

      projectRepository.findOne.mockResolvedValue(null);
      projectRepository.create.mockReturnValue({
        id: 'proj-123',
        key: expect.stringMatching(/^[A-Z]{1,4}$/),
      });
      projectRepository.save.mockResolvedValue({
        id: 'proj-123',
        key: 'MYPR',
      });

      await service.createProject(workspaceId, userId, dto);

      expect(projectRepository.save).toHaveBeenCalled();
    });

    it('should not create project with duplicate name in workspace', async () => {
      const workspaceId = 'ws-123';
      const userId = 'user-123';
      const dto = { name: 'Existing Project' };

      projectRepository.findOne.mockResolvedValue({
        id: 'proj-123',
        name: dto.name,
      });

      await expect(service.createProject(workspaceId, userId, dto)).rejects.toThrow(BadRequestException);
    });
  });
});
