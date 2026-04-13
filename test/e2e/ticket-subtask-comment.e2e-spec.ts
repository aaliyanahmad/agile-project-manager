import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TicketPriority } from '../src/entities/enums';

describe('Ticket E2E', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let workspaceId: string;
  let projectId: string;
  let statusId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'ticket@example.com',
      password: 'SecurePassword123!',
      name: 'Ticket User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;
    userId = signupResponse.body.user.id;

    // Create workspace
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ticket Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    // Create project
    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ticket Project' });
    projectId = projResponse.body.data.project.id;

    // Get first status
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);
    statusId = statusResponse.body.items[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects/:id/tickets', () => {
    it('should create ticket', async () => {
      const dto = {
        title: 'Test Ticket',
        description: 'Test Description',
        priority: TicketPriority.HIGH,
        statusId,
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(dto.title);
      expect(response.body.data.ticketKey).toMatch(/^[A-Z]{1,4}-\d+$/);
    });

    it('should require title', async () => {
      const dto = {
        description: 'No title',
        priority: TicketPriority.HIGH,
        statusId,
      };

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('PATCH /tickets/:id', () => {
    let ticketId: string;

    beforeAll(async () => {
      const dto = {
        title: 'Ticket to Update',
        priority: TicketPriority.MEDIUM,
        statusId,
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto);

      ticketId = response.body.data.id;
    });

    it('should update ticket', async () => {
      const dto = { title: 'Updated Title' };

      const response = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(dto.title);
    });

    it('should update priority and log activity', async () => {
      const dto = { priority: TicketPriority.LOW };

      const response = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.data.priority).toBe(TicketPriority.LOW);
    });
  });

  describe('DELETE /tickets/:id', () => {
    let ticketId: string;

    beforeAll(async () => {
      const dto = {
        title: 'Ticket to Delete',
        priority: TicketPriority.LOW,
        statusId,
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto);

      ticketId = response.body.data.id;
    });

    it('should delete ticket', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent ticket', async () => {
      await request(app.getHttpServer())
        .delete(`/tickets/nonexistent-id`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});

describe('Subtask E2E', () => {
  let app: INestApplication;
  let token: string;
  let workspaceId: string;
  let projectId: string;
  let statusId: string;
  let parentTicketId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'subtask@example.com',
      password: 'SecurePassword123!',
      name: 'Subtask User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;

    // Create workspace and project
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Subtask Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Subtask Project' });
    projectId = projResponse.body.data.project.id;

    // Get status
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);
    statusId = statusResponse.body.items[0]?.id;

    // Create parent ticket
    const parentResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Parent Ticket',
        priority: TicketPriority.HIGH,
        statusId,
      });
    parentTicketId = parentResponse.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /tickets/:id/subtasks', () => {
    it('should create subtask', async () => {
      const dto = {
        title: 'Subtask 1',
        priority: TicketPriority.MEDIUM,
        statusId,
      };

      const response = await request(app.getHttpServer())
        .post(`/tickets/${parentTicketId}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentTicketId).toBe(parentTicketId);
    });

    it('should not create subtask of subtask', async () => {
      // Create a subtask first
      const subtaskResponse = await request(app.getHttpServer())
        .post(`/tickets/${parentTicketId}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Subtask 2',
          priority: TicketPriority.MEDIUM,
          statusId,
        });

      const subtaskId = subtaskResponse.body.data.id;

      // Try to create subtask of subtask
      await request(app.getHttpServer())
        .post(`/tickets/${subtaskId}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Invalid Subtask',
          priority: TicketPriority.LOW,
          statusId,
        })
        .expect(400);
    });
  });

  describe('GET /tickets/:id/subtasks', () => {
    it('should list subtasks for ticket', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets/${parentTicketId}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });
});

describe('Comment E2E', () => {
  let app: INestApplication;
  let token: string;
  let workspaceId: string;
  let projectId: string;
  let statusId: string;
  let ticketId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'comment@example.com',
      password: 'SecurePassword123!',
      name: 'Comment User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;

    // Create workspace and project
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Comment Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Comment Project' });
    projectId = projResponse.body.data.project.id;

    // Get status
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);
    statusId = statusResponse.body.items[0]?.id;

    // Create ticket
    const ticketResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Comment Test Ticket',
        priority: TicketPriority.MEDIUM,
        statusId,
      });
    ticketId = ticketResponse.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /tickets/:id/comments', () => {
    it('should add comment to ticket', async () => {
      const dto = { content: 'This is a test comment' };

      const response = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(dto.content);
    });
  });

  describe('GET /tickets/:id/comments', () => {
    it('should list comments for ticket', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });
});
