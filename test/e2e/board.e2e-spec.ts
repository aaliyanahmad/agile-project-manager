import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TicketPriority, StatusCategory } from '../src/entities/enums';

describe('Board E2E', () => {
  let app: INestApplication;
  let token: string;
  let workspaceId: string;
  let projectId: string;
  let todoStatusId: string;
  let inProgressStatusId: string;
  let doneStatusId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'board@example.com',
      password: 'SecurePassword123!',
      name: 'Board User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;

    // Create workspace
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Board Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    // Create project
    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Board Project' });
    projectId = projResponse.body.data.project.id;

    // Get statuses
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);

    const statuses = statusResponse.body.items;
    todoStatusId = statuses.find((s) => s.category === StatusCategory.TODO)?.id;
    inProgressStatusId = statuses.find((s) => s.category === StatusCategory.IN_PROGRESS)?.id;
    doneStatusId = statuses.find((s) => s.category === StatusCategory.DONE)?.id;

    // Create test tickets
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: `Board Ticket ${i + 1}`,
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /projects/:id/board', () => {
    it('should fetch board with statuses and tickets', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statuses');
      expect(Array.isArray(response.body.data.statuses)).toBe(true);
    });

    it('should include tickets grouped by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const statuses = response.body.data.statuses;
      const todoColumn = statuses.find((s) => s.id === todoStatusId);

      expect(todoColumn).toBeDefined();
      expect(Array.isArray(todoColumn.tickets)).toBe(true);
      expect(todoColumn.tickets.length).toBeGreaterThan(0);
    });

    it('should include ticket count per status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const statuses = response.body.data.statuses;
      statuses.forEach((status) => {
        expect(status).toHaveProperty('ticketCount');
      });
    });
  });

  describe('PATCH /tickets/:id/status', () => {
    let ticketId: string;

    beforeAll(async () => {
      const ticketResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Status Change Ticket',
          priority: TicketPriority.HIGH,
          statusId: todoStatusId,
        });

      ticketId = ticketResponse.body.data.id;
    });

    it('should move ticket to different status', async () => {
      const dto = { statusId: inProgressStatusId };

      const response = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statusId).toBe(inProgressStatusId);
    });

    it('should move to done status', async () => {
      const dto = { statusId: doneStatusId };

      const response = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.data.statusId).toBe(doneStatusId);
    });

    it('should return 400 for invalid status', async () => {
      const dto = { statusId: 'invalid-status-id' };

      await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('Board Performance - No N+1 queries', () => {
    it('should efficiently load board with many tickets', async () => {
      // Create 50 tickets
      const ticketIds = [];
      for (let i = 0; i < 50; i++) {
        const response = await request(app.getHttpServer())
          .post(`/projects/${projectId}/tickets`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: `Perf Ticket ${i}`,
            priority: Math.floor(Math.random() * 5),
            statusId: todoStatusId,
          });
        ticketIds.push(response.body.data.id);
      }

      // Fetch board - should be efficient
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      // Should complete in reasonable time (< 2 seconds for 50 items)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Board Filtering', () => {
    let highPriorityTicketId: string;
    let mediumPriorityTicketId: string;

    beforeAll(async () => {
      const highResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'High Priority Board Ticket',
          priority: TicketPriority.CRITICAL,
          statusId: todoStatusId,
        });
      highPriorityTicketId = highResponse.body.data.id;

      const mediumResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Medium Priority Board Ticket',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });
      mediumPriorityTicketId = mediumResponse.body.data.id;
    });

    it('should filter board by priority', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/board?priority=CRITICAL`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const allTickets = response.body.data.statuses.flatMap((s) => s.tickets);
      expect(allTickets.some((t) => t.id === highPriorityTicketId)).toBe(true);
    });

    it('should support multiple filter parameters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/board?priority=MEDIUM&statusId=${todoStatusId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Board with Subtasks', () => {
    let parentTicketId: string;

    beforeAll(async () => {
      const parentResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Parent Ticket with Subtasks',
          priority: TicketPriority.HIGH,
          statusId: todoStatusId,
        });
      parentTicketId = parentResponse.body.data.id;

      // Add subtasks
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/tickets/${parentTicketId}/subtasks`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: `Subtask ${i + 1}`,
            priority: TicketPriority.MEDIUM,
            statusId: todoStatusId,
          });
      }
    });

    it('should display subtask count on board', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const statuses = response.body.data.statuses;
      const todoColumn = statuses.find((s) => s.id === todoStatusId);
      const parentTicket = todoColumn.tickets.find((t) => t.id === parentTicketId);

      expect(parentTicket).toBeDefined();
      expect(parentTicket).toHaveProperty('subtaskCount');
      expect(parentTicket.subtaskCount).toBe(3);
    });

    it('should include subtask completion percentage', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const statuses = response.body.data.statuses;
      const todoColumn = statuses.find((s) => s.id === todoStatusId);
      const parentTicket = todoColumn.tickets.find((t) => t.id === parentTicketId);

      expect(parentTicket).toHaveProperty('subtaskCompletionPercentage');
    });
  });
});

describe('Board Activity Logging', () => {
  let app: INestApplication;
  let token: string;
  let projectId: string;
  let statusId: string;
  let targetStatusId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'board-activity@example.com',
      password: 'SecurePassword123!',
      name: 'Board Activity User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;

    // Create workspace and project
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Board Activity Workspace' });

    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${wsResponse.body.data.workspace.id}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Board Activity Project' });
    projectId = projResponse.body.data.project.id;

    // Get statuses
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);

    const statuses = statusResponse.body.items;
    statusId = statuses[0]?.id;
    targetStatusId = statuses[1]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should log activity when ticket status changes', async () => {
    // Create ticket
    const ticketResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Activity Log Ticket',
        priority: TicketPriority.MEDIUM,
        statusId,
      });

    const ticketId = ticketResponse.body.data.id;

    // Change status
    await request(app.getHttpServer())
      .patch(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ statusId: targetStatusId })
      .expect(200);

    // Check activity log
    const activityResponse = await request(app.getHttpServer())
      .get(`/tickets/${ticketId}/activity`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(activityResponse.body.items)).toBe(true);
    expect(activityResponse.body.items.length).toBeGreaterThan(0);

    // Find status change activity
    const statusChangeActivity = activityResponse.body.items.find(
      (a) => a.action === 'STATUS_CHANGED',
    );
    expect(statusChangeActivity).toBeDefined();
  });
});
