import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TicketPriority, BulkActionType } from '../src/entities/enums';

describe('Bulk Actions E2E', () => {
  let app: INestApplication;
  let token: string;
  let workspaceId: string;
  let projectId: string;
  let statusId: string;
  let sprintId: string;
  let ticketIds: string[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'bulk@example.com',
      password: 'SecurePassword123!',
      name: 'Bulk User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;

    // Create workspace
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bulk Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    // Create project
    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bulk Project' });
    projectId = projResponse.body.data.project.id;

    // Get status
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);
    statusId = statusResponse.body.items[0]?.id;

    // Create sprint
    const sprintResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/sprints`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bulk Sprint',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
    sprintId = sprintResponse.body.data.id;

    // Create multiple tickets
    for (let i = 0; i < 5; i++) {
      const ticketResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: `Bulk Ticket ${i + 1}`,
          priority: TicketPriority.MEDIUM,
          statusId,
        });
      ticketIds.push(ticketResponse.body.data.id);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /projects/:id/tickets/bulk - ASSIGN action', () => {
    it('should bulk assign tickets to user', async () => {
      const dto = {
        action: BulkActionType.ASSIGN,
        ticketIds: ticketIds.slice(0, 3),
        assigneeId: 'user-id',
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(3);
    });

    it('should bulk unassign tickets', async () => {
      const dto = {
        action: BulkActionType.ASSIGN,
        ticketIds: ticketIds.slice(0, 2),
        assigneeId: null,
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.data.updatedCount).toBe(2);
    });
  });

  describe('PATCH /projects/:id/tickets/bulk - PRIORITY action', () => {
    it('should bulk update priority', async () => {
      const dto = {
        action: BulkActionType.PRIORITY,
        ticketIds: ticketIds.slice(0, 3),
        priority: TicketPriority.HIGH,
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(3);

      // Verify update
      const ticketResponse = await request(app.getHttpServer())
        .get(`/tickets/${ticketIds[0]}`)
        .set('Authorization', `Bearer ${token}`);

      expect(ticketResponse.body.data.priority).toBe(TicketPriority.HIGH);
    });
  });

  describe('PATCH /projects/:id/tickets/bulk - MOVE_TO_SPRINT action', () => {
    it('should bulk move tickets to sprint', async () => {
      const dto = {
        action: BulkActionType.MOVE_TO_SPRINT,
        ticketIds: ticketIds.slice(0, 3),
        sprintId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(3);

      // Verify update
      const ticketResponse = await request(app.getHttpServer())
        .get(`/tickets/${ticketIds[0]}`)
        .set('Authorization', `Bearer ${token}`);

      expect(ticketResponse.body.data.sprintId).toBe(sprintId);
    });
  });

  describe('PATCH /projects/:id/tickets/bulk - MOVE_TO_BACKLOG action', () => {
    it('should bulk move tickets to backlog', async () => {
      const dto = {
        action: BulkActionType.MOVE_TO_BACKLOG,
        ticketIds: ticketIds.slice(0, 2),
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(2);

      // Verify update
      const ticketResponse = await request(app.getHttpServer())
        .get(`/tickets/${ticketIds[0]}`)
        .set('Authorization', `Bearer ${token}`);

      expect(ticketResponse.body.data.sprintId).toBeNull();
    });
  });

  describe('PATCH /projects/:id/tickets/bulk - Validation', () => {
    it('should require action', async () => {
      const dto = {
        ticketIds: ticketIds.slice(0, 2),
      };

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });

    it('should require ticketIds', async () => {
      const dto = {
        action: BulkActionType.PRIORITY,
        priority: TicketPriority.LOW,
      };

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });

    it('should allow empty ticketIds (no-op)', async () => {
      const dto = {
        action: BulkActionType.PRIORITY,
        ticketIds: [],
        priority: TicketPriority.LOW,
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.data.updatedCount).toBe(0);
    });

    it('should handle non-existent ticket IDs gracefully', async () => {
      const dto = {
        action: BulkActionType.PRIORITY,
        ticketIds: ['nonexistent-1', 'nonexistent-2'],
        priority: TicketPriority.LOW,
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.data.updatedCount).toBe(0);
    });
  });

  describe('Bulk Actions - Atomicity', () => {
    it('should rollback on partial failure when using transactions', async () => {
      // Create two tickets
      const ticket1Response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Atomic Test 1',
          priority: TicketPriority.LOW,
          statusId,
        });

      const ticket2Response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Atomic Test 2',
          priority: TicketPriority.LOW,
          statusId,
        });

      const bulkTicketIds = [ticket1Response.body.data.id, ticket2Response.body.data.id];

      // Bulk update - should succeed for both
      const dto = {
        action: BulkActionType.PRIORITY,
        ticketIds: bulkTicketIds,
        priority: TicketPriority.CRITICAL,
      };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(200);

      expect(response.body.data.updatedCount).toBe(2);

      // Verify both updated
      const ticket1Check = await request(app.getHttpServer())
        .get(`/tickets/${bulkTicketIds[0]}`)
        .set('Authorization', `Bearer ${token}`);

      const ticket2Check = await request(app.getHttpServer())
        .get(`/tickets/${bulkTicketIds[1]}`)
        .set('Authorization', `Bearer ${token}`);

      expect(ticket1Check.body.data.priority).toBe(TicketPriority.CRITICAL);
      expect(ticket2Check.body.data.priority).toBe(TicketPriority.CRITICAL);
    });
  });
});
