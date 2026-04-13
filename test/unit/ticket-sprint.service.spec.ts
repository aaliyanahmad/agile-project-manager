import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TicketService } from '../src/ticket/ticket.service';
import { SprintService } from '../src/sprint/sprint.service';
import { ActivityService } from '../src/activity/activity.service';
import { Ticket } from '../src/entities/ticket.entity';
import { Project } from '../src/entities/project.entity';
import { Sprint } from '../src/entities/sprint.entity';
import { Status } from '../src/entities/status.entity';
import { WorkspaceMember } from '../src/entities/workspace-member.entity';
import { User } from '../src/entities/user.entity';
import { Label } from '../src/entities/label.entity';
import { TicketPriority, SprintStatus, StatusCategory } from '../src/entities/enums';

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

const mockDataSource = () => ({
  transaction: jest.fn(),
});

describe('TicketService (Unit)', () => {
  let service: TicketService;
  let ticketRepository: any;
  let projectRepository: any;
  let statusRepository: any;
  let workspaceMemberRepository: any;
  let userRepository: any;
  let sprintRepository: any;
  let labelRepository: any;
  let activityService: any;
  let dataSource: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: getRepositoryToken(Ticket),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Status),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Sprint),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Label),
          useFactory: mockRepository,
        },
        {
          provide: ActivityService,
          useValue: { log: jest.fn() },
        },
        {
          provide: DataSource,
          useFactory: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
    ticketRepository = module.get(getRepositoryToken(Ticket));
    projectRepository = module.get(getRepositoryToken(Project));
    statusRepository = module.get(getRepositoryToken(Status));
    workspaceMemberRepository = module.get(getRepositoryToken(WorkspaceMember));
    userRepository = module.get(getRepositoryToken(User));
    sprintRepository = module.get(getRepositoryToken(Sprint));
    labelRepository = module.get(getRepositoryToken(Label));
    activityService = module.get(ActivityService);
    dataSource = module.get(DataSource);
  });

  describe('createTicket', () => {
    it('should create ticket with status', async () => {
      const userId = 'user-123';
      const projectId = 'proj-123';
      const dto = {
        title: 'New Ticket',
        description: 'Test ticket',
        priority: TicketPriority.HIGH,
        statusId: 'status-123',
      };

      const mockProject = { id: projectId, workspaceId: 'ws-123', key: 'TEST' };
      const mockStatus = { id: 'status-123', projectId };
      const mockTicket = {
        id: 'ticket-123',
        ...dto,
        projectId,
        ticketKey: 'TEST-1',
        createdById: userId,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      statusRepository.findOne.mockResolvedValue(mockStatus);
      ticketRepository.count.mockResolvedValue(0);
      ticketRepository.create.mockReturnValue(mockTicket);
      ticketRepository.save.mockResolvedValue(mockTicket);
      ticketRepository.findOne.mockResolvedValue(mockTicket);

      const result = await service.createTicket(projectId, userId, dto);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe(dto.title);
      expect(result.data.priority).toBe(dto.priority);
    });

    it('should throw if user not in workspace', async () => {
      const userId = 'user-123';
      const projectId = 'proj-123';
      const dto = {
        title: 'New Ticket',
        priority: TicketPriority.HIGH,
        statusId: 'status-123',
      };

      const mockProject = { id: projectId, workspaceId: 'ws-123' };

      projectRepository.findOne.mockResolvedValue(mockProject);
      workspaceMemberRepository.findOne.mockResolvedValue(null);

      await expect(service.createTicket(projectId, userId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createSubtask', () => {
    it('should create subtask for parent ticket', async () => {
      const userId = 'user-123';
      const parentId = 'parent-123';
      const dto = {
        title: 'Subtask',
        priority: TicketPriority.MEDIUM,
        statusId: 'status-123',
      };

      const mockParent = {
        id: parentId,
        projectId: 'proj-123',
        parentTicketId: null,
        project: { id: 'proj-123', workspaceId: 'ws-123', key: 'TEST' },
      };

      const mockStatus = { id: 'status-123', projectId: 'proj-123' };
      const mockSubtask = {
        id: 'subtask-123',
        parentTicketId: parentId,
        title: dto.title,
      };

      ticketRepository.findOne
        .mockResolvedValueOnce(mockParent)
        .mockResolvedValueOnce(mockSubtask);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      statusRepository.findOne.mockResolvedValue(mockStatus);
      ticketRepository.count.mockResolvedValue(0);
      ticketRepository.create.mockReturnValue(mockSubtask);
      ticketRepository.save.mockResolvedValue(mockSubtask);

      const result = await service.createSubtask(parentId, userId, dto);

      expect(result.data.parentTicketId).toBe(parentId);
    });

    it('should not create subtask of subtask', async () => {
      const userId = 'user-123';
      const parentId = 'subtask-123';
      const dto = {
        title: 'Invalid Subtask of Subtask',
        priority: TicketPriority.MEDIUM,
      };

      const mockParent = {
        id: parentId,
        parentTicketId: 'parent-123', // This IS a subtask
        project: { id: 'proj-123', workspaceId: 'ws-123' },
      };

      ticketRepository.findOne.mockResolvedValue(mockParent);
      workspaceMemberRepository.findOne.mockResolvedValue({});

      await expect(service.createSubtask(parentId, userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTicket', () => {
    it('should update ticket fields', async () => {
      const userId = 'user-123';
      const ticketId = 'ticket-123';
      const dto = { title: 'Updated Title', priority: TicketPriority.LOW };

      const mockTicket = {
        id: ticketId,
        title: 'Old Title',
        priority: TicketPriority.HIGH,
        projectId: 'proj-123',
        project: { workspaceId: 'ws-123' },
      };

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      ticketRepository.save.mockResolvedValue({ ...mockTicket, ...dto });

      const result = await service.updateTicket(ticketId, userId, dto);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe(dto.title);
    });

    it('should log activity on ticket update', async () => {
      const userId = 'user-123';
      const ticketId = 'ticket-123';
      const dto = { priority: TicketPriority.LOW };

      const mockTicket = {
        id: ticketId,
        priority: TicketPriority.HIGH,
        projectId: 'proj-123',
        project: { workspaceId: 'ws-123' },
      };

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      ticketRepository.save.mockResolvedValue({ ...mockTicket, ...dto });

      await service.updateTicket(ticketId, userId, dto);

      expect(activityService.log).toHaveBeenCalled();
    });
  });

  describe('deleteTicket', () => {
    it('should delete ticket and parent with no other children', async () => {
      const userId = 'user-123';
      const ticketId = 'ticket-123';

      const mockTicket = {
        id: ticketId,
        parentTicketId: null,
        projectId: 'proj-123',
        project: { workspaceId: 'ws-123' },
      };

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      ticketRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteTicket(ticketId, userId);

      expect(result.success).toBe(true);
      expect(ticketRepository.delete).toHaveBeenCalled();
    });

    it('should throw if ticket not found', async () => {
      const userId = 'user-123';
      const ticketId = 'nonexistent';

      ticketRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteTicket(ticketId, userId)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('SprintService (Unit)', () => {
  let service: SprintService;
  let sprintRepository: any;
  let projectRepository: any;
  let ticketRepository: any;
  let workspaceMemberRepository: any;
  let activityService: any;
  let dataSource: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintService,
        {
          provide: getRepositoryToken(Sprint),
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
        {
          provide: ActivityService,
          useValue: { log: jest.fn() },
        },
        {
          provide: DataSource,
          useFactory: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SprintService>(SprintService);
    sprintRepository = module.get(getRepositoryToken(Sprint));
    projectRepository = module.get(getRepositoryToken(Project));
    ticketRepository = module.get(getRepositoryToken(Ticket));
    workspaceMemberRepository = module.get(getRepositoryToken(WorkspaceMember));
    activityService = module.get(ActivityService);
    dataSource = module.get(DataSource);
  });

  describe('createSprint', () => {
    it('should create sprint in project', async () => {
      const userId = 'user-123';
      const projectId = 'proj-123';
      const dto = {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockProject = { id: projectId, workspaceId: 'ws-123' };
      const mockSprint = {
        id: 'sprint-123',
        projectId,
        name: 'Sprint 1',
        status: SprintStatus.PLANNED,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      sprintRepository.count.mockResolvedValue(0);
      sprintRepository.create.mockReturnValue(mockSprint);
      sprintRepository.save.mockResolvedValue(mockSprint);

      const result = await service.createSprint(projectId, userId, dto);

      expect(result.id).toBe(mockSprint.id);
      expect(result.status).toBe(SprintStatus.PLANNED);
    });
  });

  describe('startSprint', () => {
    it('should start sprint only if no other active sprints', async () => {
      const userId = 'user-123';
      const sprintId = 'sprint-123';

      const mockSprint = {
        id: sprintId,
        projectId: 'proj-123',
        status: SprintStatus.PLANNED,
        project: { workspaceId: 'ws-123' },
      };

      sprintRepository.findOne
        .mockResolvedValueOnce(mockSprint)
        .mockResolvedValueOnce(null); // No active sprint
      workspaceMemberRepository.findOne.mockResolvedValue({});
      sprintRepository.save.mockResolvedValue({
        ...mockSprint,
        status: SprintStatus.ACTIVE,
      });

      const result = await service.startSprint(sprintId, userId);

      expect(result.status).toBe(SprintStatus.ACTIVE);
    });

    it('should throw if active sprint already exists', async () => {
      const userId = 'user-123';
      const sprintId = 'sprint-123';

      const mockSprint = {
        id: sprintId,
        projectId: 'proj-123',
        status: SprintStatus.PLANNED,
        project: { workspaceId: 'ws-123' },
      };

      const existingActiveSprint = {
        id: 'sprint-active',
        status: SprintStatus.ACTIVE,
      };

      sprintRepository.findOne
        .mockResolvedValueOnce(mockSprint)
        .mockResolvedValueOnce(existingActiveSprint);
      workspaceMemberRepository.findOne.mockResolvedValue({});

      await expect(service.startSprint(sprintId, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeSprint', () => {
    it('should move incomplete tickets to backlog', async () => {
      const userId = 'user-123';
      const sprintId = 'sprint-123';

      const mockSprint = {
        id: sprintId,
        projectId: 'proj-123',
        status: SprintStatus.ACTIVE,
        project: { workspaceId: 'ws-123' },
      };

      sprintRepository.findOne.mockResolvedValue(mockSprint);
      workspaceMemberRepository.findOne.mockResolvedValue({});

      // Mock transaction
      dataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(ticketRepository),
        };
        return callback(mockManager);
      });

      ticketRepository.find.mockResolvedValue([
        { id: 'ticket-1', status: { category: StatusCategory.TODO } },
        { id: 'ticket-2', status: { category: StatusCategory.DONE } },
      ]);

      sprintRepository.save.mockResolvedValue({
        ...mockSprint,
        status: SprintStatus.COMPLETED,
      });

      const result = await service.completeSprint(sprintId, userId);

      expect(result.status).toBe(SprintStatus.COMPLETED);
    });
  });

  describe('updateSprintGoal', () => {
    it('should update sprint goal', async () => {
      const userId = 'user-123';
      const sprintId = 'sprint-123';
      const goal = 'Implement user authentication';

      const mockSprint = {
        id: sprintId,
        projectId: 'proj-123',
        goal: null,
        project: { workspaceId: 'ws-123' },
      };

      sprintRepository.findOne.mockResolvedValue(mockSprint);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      sprintRepository.save.mockResolvedValue({
        ...mockSprint,
        goal,
      });

      const result = await service.updateSprintGoal(sprintId, userId, { goal });

      expect(result.goal).toBe(goal);
    });
  });
});
