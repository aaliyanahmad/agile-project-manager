import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentService } from '../src/comment/comment.service';
import { ActivityService } from '../src/activity/activity.service';
import { Comment } from '../src/entities/comment.entity';
import { Ticket } from '../src/entities/ticket.entity';
import { Project } from '../src/entities/project.entity';
import { WorkspaceMember } from '../src/entities/workspace-member.entity';
import { User } from '../src/entities/user.entity';
import { ActivityLog } from '../src/entities/activity-log.entity';
import { ActivityAction } from '../src/entities/activity-action.enum';

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
});

describe('CommentService (Unit)', () => {
  let service: CommentService;
  let commentRepository: any;
  let ticketRepository: any;
  let projectRepository: any;
  let workspaceMemberRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: getRepositoryToken(Comment),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Project),
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
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    commentRepository = module.get(getRepositoryToken(Comment));
    ticketRepository = module.get(getRepositoryToken(Ticket));
    workspaceMemberRepository = module.get(getRepositoryToken(WorkspaceMember));
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('addComment', () => {
    it('should add comment to ticket', async () => {
      const userId = 'user-123';
      const ticketId = 'ticket-123';
      const dto = { content: 'Test comment' };

      const mockTicket = {
        id: ticketId,
        projectId: 'proj-123',
        project: { workspaceId: 'ws-123' },
      };

      const mockComment = {
        id: 'comment-123',
        ticketId,
        userId,
        content: dto.content,
        user: { id: userId, name: 'User Name' },
      };

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      commentRepository.create.mockReturnValue(mockComment);
      commentRepository.save.mockResolvedValue(mockComment);
      commentRepository.findOne.mockResolvedValue(mockComment);

      const result = await service.addComment(ticketId, userId, dto);

      expect(result.success).toBe(true);
      expect(result.data.content).toBe(dto.content);
    });

    it('should throw if ticket not found', async () => {
      const userId = 'user-123';
      const ticketId = 'nonexistent';
      const dto = { content: 'Test comment' };

      ticketRepository.findOne.mockResolvedValue(null);

      await expect(service.addComment(ticketId, userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if user not in workspace', async () => {
      const userId = 'user-123';
      const ticketId = 'ticket-123';
      const dto = { content: 'Test comment' };

      const mockTicket = {
        id: ticketId,
        project: { workspaceId: 'ws-123' },
      };

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      workspaceMemberRepository.findOne.mockResolvedValue(null);

      await expect(service.addComment(ticketId, userId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateComment', () => {
    it('should update comment if user is author', async () => {
      const userId = 'user-123';
      const commentId = 'comment-123';
      const dto = { content: 'Updated content' };

      const mockComment = {
        id: commentId,
        userId,
        content: 'Old content',
        ticketId: 'ticket-123',
        ticket: { project: { workspaceId: 'ws-123' }, projectId: 'proj-123' },
      };

      commentRepository.findOne.mockResolvedValue(mockComment);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      commentRepository.save.mockResolvedValue({
        ...mockComment,
        content: dto.content,
      });

      const result = await service.updateComment(commentId, userId, dto);

      expect(result.success).toBe(true);
      expect(result.data.content).toBe(dto.content);
    });

    it('should throw if user is not comment author', async () => {
      const userId = 'user-123';
      const commentId = 'comment-123';
      const dto = { content: 'Updated content' };

      const mockComment = {
        id: commentId,
        userId: 'other-user',
        ticket: { project: { workspaceId: 'ws-123' } },
      };

      commentRepository.findOne.mockResolvedValue(mockComment);
      workspaceMemberRepository.findOne.mockResolvedValue({});

      await expect(service.updateComment(commentId, userId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment if user is author', async () => {
      const userId = 'user-123';
      const commentId = 'comment-123';

      const mockComment = {
        id: commentId,
        userId,
        ticket: { project: { workspaceId: 'ws-123' } },
      };

      commentRepository.findOne.mockResolvedValue(mockComment);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      commentRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteComment(commentId, userId);

      expect(result.success).toBe(true);
    });

    it('should throw if user is not author', async () => {
      const userId = 'user-123';
      const commentId = 'comment-123';

      const mockComment = {
        id: commentId,
        userId: 'other-user',
        ticket: { project: { workspaceId: 'ws-123' } },
      };

      commentRepository.findOne.mockResolvedValue(mockComment);
      workspaceMemberRepository.findOne.mockResolvedValue({});

      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});

describe('ActivityService (Unit)', () => {
  let service: ActivityService;
  let activityRepository: any;
  let ticketRepository: any;
  let workspaceMemberRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: getRepositoryToken(ActivityLog),
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

    service = module.get<ActivityService>(ActivityService);
    activityRepository = module.get(getRepositoryToken(ActivityLog));
    ticketRepository = module.get(getRepositoryToken(Ticket));
    workspaceMemberRepository = module.get(getRepositoryToken(WorkspaceMember));
  });

  describe('log', () => {
    it('should create activity log', async () => {
      const params = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        action: ActivityAction.STATUS_CHANGED,
        metadata: { field: 'status', from: 'TODO', to: 'IN_PROGRESS' },
      };

      const mockActivityLog = {
        id: 'activity-123',
        ...params,
      };

      activityRepository.create.mockReturnValue(mockActivityLog);
      activityRepository.save.mockResolvedValue(mockActivityLog);

      const result = await service.log(params);

      expect(result?.id).toBe('activity-123');
      expect(result?.action).toBe(ActivityAction.STATUS_CHANGED);
    });

    it('should include metadata in log', async () => {
      const params = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        action: ActivityAction.PRIORITY_CHANGED,
        metadata: { field: 'priority', from: 'HIGH', to: 'LOW' },
      };

      const mockActivityLog = {
        id: 'activity-123',
        ...params,
      };

      activityRepository.create.mockReturnValue(mockActivityLog);
      activityRepository.save.mockResolvedValue(mockActivityLog);

      const result = await service.log(params);

      expect(result?.metadata).toEqual(params.metadata);
    });
  });

  describe('getActivityLogs', () => {
    it('should return paginated activity logs for ticket', async () => {
      const ticketId = 'ticket-123';
      const userId = 'user-123';

      const mockTicket = {
        id: ticketId,
        project: { workspaceId: 'ws-123' },
      };

      const mockLogs = [
        {
          id: 'activity-1',
          action: ActivityAction.TICKET_CREATED,
        },
        {
          id: 'activity-2',
          action: ActivityAction.STATUS_CHANGED,
        },
      ];

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      workspaceMemberRepository.findOne.mockResolvedValue({});
      activityRepository.findAndCount.mockResolvedValue([mockLogs, 2]);

      const result = await service.getActivityLogs(ticketId, userId, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});
