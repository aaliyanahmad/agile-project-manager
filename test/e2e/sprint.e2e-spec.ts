import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TicketPriority, SprintStatus } from '../src/entities/enums';

describe('Sprint E2E', () => {
  let app: INestApplication;
  let token: string;
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
      email: 'sprint@example.com',
      password: 'SecurePassword123!',
      name: 'Sprint User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;

    // Create workspace
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sprint Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    // Create project
    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sprint Project' });
    projectId = projResponse.body.data.project.id;

    // Get status
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);
    statusId = statusResponse.body.items[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects/:id/sprints', () => {
    it('should create sprint', async () => {
      const dto = {
        name: 'Sprint 1',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(dto.name);
      expect(response.body.data.status).toBe(SprintStatus.PLANNING);
    });

    it('should require name', async () => {
      const dto = {
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });

    it('should require unique sprint name per project', async () => {
      const dto = {
        name: 'Duplicate Sprint',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      // Create first
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto);

      // Try duplicate
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('GET /projects/:id/sprints', () => {
    it('should list sprints for project', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('PATCH /sprints/:id/start', () => {
    let sprintId: string;

    beforeAll(async () => {
      const dto = {
        name: 'Sprint to Start',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto);

      sprintId = response.body.data.id;
    });

    it('should start sprint', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/sprints/${sprintId}/start`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(SprintStatus.ACTIVE);
    });

    it('should not start sprint if already active', async () => {
      await request(app.getHttpServer())
        .patch(`/sprints/${sprintId}/start`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });

  describe('PATCH /sprints/:id/complete', () => {
    let sprintId: string;
    let ticketId: string;

    beforeAll(async () => {
      const sprintDto = {
        name: 'Sprint to Complete',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      const sprintResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send(sprintDto);
      sprintId = sprintResponse.body.data.id;

      // Start the sprint
      await request(app.getHttpServer())
        .patch(`/sprints/${sprintId}/start`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Create tickets for sprint
      const ticketResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Incomplete Ticket',
          priority: TicketPriority.HIGH,
          statusId,
          sprintId,
        });
      ticketId = ticketResponse.body.data.id;
    });

    it('should complete sprint and move incomplete tickets to backlog', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/sprints/${sprintId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(SprintStatus.COMPLETED);

      // Verify ticket moved to backlog
      const ticketResponse = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(ticketResponse.body.data.sprintId).toBeNull();
    });
  });

  describe('PATCH /sprints/:id', () => {
    let sprintId: string;

    beforeAll(async () => {
      const dto = {
        name: 'Sprint to Update',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto);

      sprintId = response.body.data.id;
    });

    it('should update sprint goal', async () => {
      const dto = { goal: 'Complete core features' };

      const response = await request(app.getHttpServer())
        .patch(`/sprints/${sprintId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.data.goal).toBe(dto.goal);
    });

    it('should update sprint dates', async () => {
      const newEndDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
      const dto = { endDate: newEndDate };

      const response = await request(app.getHttpServer())
        .patch(`/sprints/${sprintId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(new Date(response.body.data.endDate).getTime()).toBeCloseTo(newEndDate.getTime(), -3);
    });
  });
});

describe('Multiple Active Sprints Prevention', () => {
  let app: INestApplication;
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'multisprint@example.com',
      password: 'SecurePassword123!',
      name: 'Multi Sprint User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;

    // Create workspace and project
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Multi Sprint Workspace' });

    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${wsResponse.body.data.workspace.id}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Multi Sprint Project' });

    projectId = projResponse.body.data.project.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should prevent multiple active sprints', async () => {
    // Create and start first sprint
    const sprint1Response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/sprints`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Active Sprint 1',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

    const sprintId1 = sprint1Response.body.data.id;

    await request(app.getHttpServer())
      .patch(`/sprints/${sprintId1}/start`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    // Create second sprint
    const sprint2Response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/sprints`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Active Sprint 2',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

    const sprintId2 = sprint2Response.body.data.id;

    // Try to start second sprint
    await request(app.getHttpServer())
      .patch(`/sprints/${sprintId2}/start`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });
});
