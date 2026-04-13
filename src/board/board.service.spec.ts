import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardService } from './board.service';
import { Ticket } from '../entities/ticket.entity';
import { Project } from '../entities/project.entity';
import { Status } from '../entities/status.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { ActivityService } from '../activity/activity.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { StatusCategory, TicketPriority } from '../entities/enums';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockActivityService = () => ({
  log: jest.fn(),
});

describe('BoardService', () => {
  let service: BoardService;
  let ticketRepo: any;
  let projectRepo: any;
  let statusRepo: any;
  let workspaceMemberRepo: any;
  let activityService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
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
          provide: getRepositoryToken(WorkspaceMember),
          useFactory: mockRepository,
        },
        {
          provide: ActivityService,
          useFactory: mockActivityService,
        },
      ],
    }).compile();

    service = module.get<BoardService>(BoardService);
    ticketRepo = module.get(getRepositoryToken(Ticket));
    projectRepo = module.get(getRepositoryToken(Project));
    statusRepo = module.get(getRepositoryToken(Status));
    workspaceMemberRepo = module.get(getRepositoryToken(WorkspaceMember));
    activityService = module.get(ActivityService);
  });

  describe('getBoardData', () => {
    it('should return dynamic board columns with tickets grouped by status', async () => {
      const mockProject = { id: 'project-1', workspaceId: 'workspace-1' };
      const mockStatuses = [
        { id: 'status-1', projectId: 'project-1', position: 1, name: 'TODO', category: StatusCategory.TODO },
        { id: 'status-2', projectId: 'project-1', position: 2, name: 'IN_PROGRESS', category: StatusCategory.IN_PROGRESS },
      ];
      const mockTickets = [
        { id: 'ticket-1', statusId: 'status-1', title: 'Task 1', priority: TicketPriority.HIGH, ticketKey: 'KEY-1', labels: [], assignees: [] },
        { id: 'ticket-2', statusId: 'status-2', title: 'Task 2', priority: TicketPriority.MEDIUM, ticketKey: 'KEY-2', labels: [], assignees: [] },
      ];

      projectRepo.findOne.mockResolvedValue(mockProject);
      workspaceMemberRepo.findOne.mockResolvedValue({});
      statusRepo.find.mockResolvedValue(mockStatuses);

      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockTickets, 2]),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      ticketRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.getBoardData('project-1', undefined, 'user-1', { page: 1, limit: 5 });

      expect(result.success).toBe(true);
      expect(result.data.columns).toHaveLength(2);
      expect(result.data.columns[0].status.id).toBe('status-1');
      expect(result.data.columns[0].tickets).toHaveLength(1);
      expect(result.data.columns[1].tickets).toHaveLength(1);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(5);
    });

    it('should compute subtask counts for each ticket', async () => {
      const mockProject = { id: 'project-1', workspaceId: 'workspace-1' };
      const mockStatuses = [
        { id: 'status-1', projectId: 'project-1', position: 1, name: 'TODO', category: StatusCategory.TODO },
      ];
      const mockTickets = [
        { id: 'ticket-1', statusId: 'status-1', title: 'Parent Task', priority: TicketPriority.HIGH, ticketKey: 'KEY-1', parentTicketId: null, labels: [], assignees: [] },
      ];

      const mockSubtasks = [
        { parentTicketId: 'ticket-1', id: 'subtask-1', statusCategory: StatusCategory.TODO },
        { parentTicketId: 'ticket-1', id: 'subtask-2', statusCategory: StatusCategory.DONE },
      ];

      projectRepo.findOne.mockResolvedValue(mockProject);
      workspaceMemberRepo.findOne.mockResolvedValue({});
      statusRepo.find.mockResolvedValue(mockStatuses);

      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockTickets, 1]),
        getRawMany: jest.fn().mockResolvedValue(mockSubtasks),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
      };

      ticketRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.getBoardData('project-1', undefined, 'user-1', { page: 1, limit: 5 });

      expect(result.data.columns[0].tickets[0].subtaskCounts).toEqual({
        total: 2,
        completed: 1,
      });
    });

    it('should filter tickets by sprint ID', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'project-1', workspaceId: 'workspace-1' });
      workspaceMemberRepo.findOne.mockResolvedValue({});
      statusRepo.find.mockResolvedValue([]);

      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      ticketRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      await service.getBoardData('project-1', 'sprint-1', 'user-1', { page: 1, limit: 5 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ticket.sprintId = :sprintId', { sprintId: 'sprint-1' });
    });

    it('should filter tickets from backlog when sprintId is not provided', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'project-1', workspaceId: 'workspace-1' });
      workspaceMemberRepo.findOne.mockResolvedValue({});
      statusRepo.find.mockResolvedValue([]);

      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      ticketRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      await service.getBoardData('project-1', undefined, 'user-1', { page: 1, limit: 5 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ticket.sprintId IS NULL');
    });

    it('should throw NotFoundException if project does not exist', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(service.getBoardData('project-1', undefined, 'user-1', { page: 1, limit: 5 })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not in workspace', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'project-1', workspaceId: 'workspace-1' });
      workspaceMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.getBoardData('project-1', undefined, 'user-1', { page: 1, limit: 5 })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTicketStatus', () => {
    it('should update ticket status and log activity', async () => {
      const mockTicket = {
        id: 'ticket-1',
        projectId: 'project-1',
        statusId: 'status-1',
        project: { workspaceId: 'workspace-1' },
        sprint: null,
        status: { id: 'status-1', name: 'TODO' },
        assignees: [],
        labels: [],
      };

      ticketRepo.findOne
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce({ ...mockTicket, statusId: 'status-2', status: { id: 'status-2', name: 'IN_PROGRESS' } });

      workspaceMemberRepo.findOne.mockResolvedValue({});
      statusRepo.findOne.mockResolvedValue({ id: 'status-2', projectId: 'project-1', name: 'IN_PROGRESS' });
      ticketRepo.save.mockResolvedValue({ ...mockTicket, statusId: 'status-2' });

      await service.updateTicketStatus('ticket-1', 'status-2', 'user-1');

      expect(ticketRepo.save).toHaveBeenCalledWith(expect.objectContaining({ statusId: 'status-2' }));
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'ticket-1',
          userId: 'user-1',
          metadata: expect.objectContaining({
            field: 'status',
            from: 'TODO',
            to: 'IN_PROGRESS',
          }),
        }),
      );
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      ticketRepo.findOne.mockResolvedValue(null);

      await expect(service.updateTicketStatus('ticket-1', 'status-2', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not in workspace', async () => {
      ticketRepo.findOne.mockResolvedValue({ id: 'ticket-1', project: { workspaceId: 'workspace-1' } });
      workspaceMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.updateTicketStatus('ticket-1', 'status-2', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if status does not belong to project', async () => {
      const mockTicket = {
        id: 'ticket-1',
        projectId: 'project-1',
        project: { workspaceId: 'workspace-1' },
        sprint: null,
      };

      ticketRepo.findOne.mockResolvedValue(mockTicket);
      workspaceMemberRepo.findOne.mockResolvedValue({});
      statusRepo.findOne.mockResolvedValue(null);

      await expect(service.updateTicketStatus('ticket-1', 'status-2', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});

  it('should throw NotFoundException when project not found', async () => {
    projectRepo.findOne.mockResolvedValue(undefined);
    await expect(service.getBoardData('project-1', undefined, 'user-1', { page: 1, limit: 5 })).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user not in workspace', async () => {
    projectRepo.findOne.mockResolvedValue({ id: 'project-1', workspaceId: 'workspace-1' });
    workspaceMemberRepo.findOne.mockResolvedValue(undefined);
    await expect(service.getBoardData('project-1', undefined, 'user-1', { page: 1, limit: 5 })).rejects.toThrow(ForbiddenException);
  });
});
