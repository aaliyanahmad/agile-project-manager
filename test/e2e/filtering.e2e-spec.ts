import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TicketPriority, StatusCategory } from '../src/entities/enums';

describe('Ticket Filtering E2E', () => {
  let app: INestApplication;
  let token: string;
  let workspaceId: string;
  let projectId: string;
  let todoStatusId: string;
  let inProgressStatusId: string;
  let userId: string;
  let labelId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'filter@example.com',
      password: 'SecurePassword123!',
      name: 'Filter User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;
    userId = signupResponse.body.user.id;

    // Create workspace
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Filter Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    // Create project
    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Filter Project' });
    projectId = projResponse.body.data.project.id;

    // Get statuses
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);

    const statuses = statusResponse.body.items;
    todoStatusId = statuses.find((s) => s.category === StatusCategory.TODO)?.id;
    inProgressStatusId = statuses.find((s) => s.category === StatusCategory.IN_PROGRESS)?.id;

    // Create label
    const labelResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/labels`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bug',
        color: '#FF0000',
      });
    labelId = labelResponse.body.data.id;

    // Create test tickets with various properties
    // High priority TODO - assigned
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'High Priority Bug',
        priority: TicketPriority.CRITICAL,
        statusId: todoStatusId,
        labelIds: [labelId],
        assigneeId: userId,
      });

    // Medium priority IN_PROGRESS - no label
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Medium Priority Task',
        priority: TicketPriority.MEDIUM,
        statusId: inProgressStatusId,
      });

    // Low priority TODO - no assignee
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Low Priority Enhancement',
        priority: TicketPriority.LOW,
        statusId: todoStatusId,
      });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /projects/:id/tickets - Filter by status', () => {
    it('should filter tickets by single status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?statusId=${todoStatusId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.items)).toBe(true);
      response.body.items.forEach((ticket) => {
        expect(ticket.statusId).toBe(todoStatusId);
      });
    });

    it('should filter tickets by multiple statuses', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?statusIds=${todoStatusId},${inProgressStatusId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        expect([todoStatusId, inProgressStatusId]).toContain(ticket.statusId);
      });
    });
  });

  describe('GET /projects/:id/tickets - Filter by priority', () => {
    it('should filter tickets by priority', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?priority=${TicketPriority.HIGH}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        expect(ticket.priority).toBe(TicketPriority.HIGH);
      });
    });

    it('should filter by multiple priorities', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/projects/${projectId}/tickets?priorities=${TicketPriority.CRITICAL},${TicketPriority.HIGH}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        expect([TicketPriority.CRITICAL, TicketPriority.HIGH]).toContain(ticket.priority);
      });
    });
  });

  describe('GET /projects/:id/tickets - Filter by assignee', () => {
    it('should filter tickets by assignee', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?assigneeId=${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        expect(ticket.assignees).toContainEqual(expect.objectContaining({ id: userId }));
      });
    });

    it('should filter unassigned tickets', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?unassigned=true`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        expect(ticket.assignees.length).toBe(0);
      });
    });
  });

  describe('GET /projects/:id/tickets - Filter by label', () => {
    it('should filter tickets by label', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?labelIds=${labelId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        const hasLabel = ticket.labels.some((l) => l.id === labelId);
        expect(hasLabel).toBe(true);
      });
    });
  });

  describe('GET /projects/:id/tickets - Combined filters', () => {
    it('should filter by status AND priority', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/projects/${projectId}/tickets?statusId=${todoStatusId}&priority=${TicketPriority.CRITICAL}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        expect(ticket.statusId).toBe(todoStatusId);
        expect(ticket.priority).toBe(TicketPriority.CRITICAL);
      });
    });

    it('should filter by status, priority, and assignee', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/projects/${projectId}/tickets?statusId=${todoStatusId}&priority=${TicketPriority.CRITICAL}&assigneeId=${userId}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        expect(ticket.statusId).toBe(todoStatusId);
        expect(ticket.priority).toBe(TicketPriority.CRITICAL);
        expect(ticket.assignees.some((a) => a.id === userId)).toBe(true);
      });
    });
  });

  describe('GET /projects/:id/tickets - Pagination', () => {
    it('should support limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?limit=2`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(2);
    });

    it('should support offset parameter', async () => {
      const firstPageResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?limit=1&offset=0`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const secondPageResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?limit=1&offset=1`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      if (firstPageResponse.body.items.length > 0 && secondPageResponse.body.items.length > 0) {
        expect(firstPageResponse.body.items[0].id).not.toBe(secondPageResponse.body.items[0].id);
      }
    });

    it('should include total count', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(typeof response.body.total).toBe('number');
    });
  });

  describe('GET /projects/:id/tickets - Sorting', () => {
    it('should support sorting by priority', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?sortBy=priority&sortOrder=DESC`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const priorities = response.body.items.map((t) => t.priority);

      // Check if sorted descending
      for (let i = 1; i < priorities.length; i++) {
        const priorityValues = {
          CRITICAL: 5,
          HIGH: 4,
          MEDIUM: 3,
          LOW: 2,
          NONE: 1,
        };
        expect(priorityValues[priorities[i - 1]]).toBeGreaterThanOrEqual(
          priorityValues[priorities[i]],
        );
      }
    });

    it('should support sorting by creation date', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?sortBy=createdAt&sortOrder=DESC`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /projects/:id/tickets - Search', () => {
    it('should search tickets by title', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?search=Bug`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach((ticket) => {
        expect(ticket.title.toLowerCase()).toContain('bug');
      });
    });

    it('should search tickets by description', async () => {
      // Create ticket with specific description
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Searchable Ticket',
          description: 'This has a unique searchable phrase',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });

      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?search=unique`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /projects/:id/tickets - No duplicate results', () => {
    it('should not return duplicate tickets when filtering by multiple labels', async () => {
      // Create another label
      const label2Response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Feature',
          color: '#00FF00',
        });
      const label2Id = label2Response.body.data.id;

      // Create ticket with both labels
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Multi-Label Ticket',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
          labelIds: [labelId, label2Id],
        });

      // Filter by both labels
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?labelIds=${labelId},${label2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Check no duplicates
      const ids = response.body.items.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should not return duplicate tickets with complex filters', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/projects/${projectId}/tickets?statusId=${todoStatusId}&priority=${TicketPriority.CRITICAL}&labelIds=${labelId}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.items.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('GET /projects/:id/tickets - Edge cases', () => {
    it('should handle empty filter results', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?priority=NONE&statusId=${todoStatusId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.total).toBe(0);
    });

    it('should handle invalid filter values gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?priority=INVALID`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should ignore unknown filter parameters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tickets?unknownFilter=value&statusId=${todoStatusId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
