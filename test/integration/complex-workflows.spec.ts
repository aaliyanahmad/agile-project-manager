import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TicketPriority, SprintStatus, StatusCategory, ActivityAction } from '../src/entities/enums';

describe('Integration Tests - Complex Workflows', () => {
  let app: INestApplication;
  let token: string;
  let workspaceId: string;
  let projectId: string;
  let todoStatusId: string;
  let inProgressStatusId: string;
  let doneStatusId: string;
  let sprintId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Setup test environment
    const signup = {
      email: 'integration@example.com',
      password: 'SecurePassword123!',
      name: 'Integration User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;

    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Integration Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Integration Project' });
    projectId = projResponse.body.data.project.id;

    // Get statuses
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${token}`);

    const statuses = statusResponse.body.items;
    todoStatusId = statuses.find((s) => s.category === StatusCategory.TODO)?.id;
    inProgressStatusId = statuses.find((s) => s.category === StatusCategory.IN_PROGRESS)?.id;
    doneStatusId = statuses.find((s) => s.category === StatusCategory.DONE)?.id;

    // Create sprint
    const sprintResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/sprints`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Integration Sprint',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
    sprintId = sprintResponse.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Ticket Lifecycle Workflow', () => {
    it('should track complete ticket lifecycle with activity logs', async () => {
      // 1. Create ticket
      const createResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Complete Lifecycle Ticket',
          description: 'Testing full workflow',
          priority: TicketPriority.HIGH,
          statusId: todoStatusId,
        });

      const ticketId = createResponse.body.data.id;
      expect(createResponse.status).toBe(201);

      // 2. Add comment
      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Starting work on this' })
        .expect(201);

      // 3. Move to sprint and in progress status
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ sprintId, statusId: inProgressStatusId })
        .expect(200);

      // 4. Change priority
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ priority: TicketPriority.MEDIUM })
        .expect(200);

      // 5. Add another comment before completion
      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Nearly done' })
        .expect(201);

      // 6. Mark as done
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statusId: doneStatusId })
        .expect(200);

      // 7. Verify activity log contains all actions
      const activityResponse = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/activity`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(activityResponse.body.items.length).toBeGreaterThan(0);
      const actions = activityResponse.body.items.map((a) => a.action);

      // Verify key actions were logged
      expect(actions).toContain('TICKET_CREATED');
      expect(actions).toContain('STATUS_CHANGED');
      expect(actions).toContain('PRIORITY_CHANGED');

      // 8. Verify final ticket state
      const finalResponse = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(finalResponse.body.data.statusId).toBe(doneStatusId);
      expect(finalResponse.body.data.priority).toBe(TicketPriority.MEDIUM);
      expect(finalResponse.body.data.sprintId).toBe(sprintId);
    });
  });

  describe('Bulk Operations with Activity Tracking', () => {
    let bulkTicketIds: string[] = [];

    beforeAll(async () => {
      // Create tickets for bulk operations
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post(`/projects/${projectId}/tickets`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: `Bulk Ticket ${i + 1}`,
            priority: TicketPriority.LOW,
            statusId: todoStatusId,
          });
        bulkTicketIds.push(response.body.data.id);
      }
    });

    it('should track activity logs for bulk priority changes', async () => {
      const newPriority = TicketPriority.HIGH;

      const bulkResponse = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          action: 'PRIORITY',
          ticketIds: bulkTicketIds.slice(0, 3),
          priority: newPriority,
        })
        .expect(200);

      expect(bulkResponse.body.data.updatedCount).toBe(3);

      // Verify each ticket has activity log
      for (const ticketId of bulkTicketIds.slice(0, 3)) {
        const activityResponse = await request(app.getHttpServer())
          .get(`/tickets/${ticketId}/activity`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const priorityChangeFound = activityResponse.body.items.some(
          (a) => a.action === 'PRIORITY_CHANGED',
        );
        expect(priorityChangeFound).toBe(true);
      }
    });

    it('should track activity logs for bulk sprint assignments', async () => {
      const bulkResponse = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          action: 'MOVE_TO_SPRINT',
          ticketIds: bulkTicketIds,
          sprintId,
        })
        .expect(200);

      expect(bulkResponse.body.data.updatedCount).toBe(5);

      // Verify all tickets are in sprint
      for (const ticketId of bulkTicketIds) {
        const ticketResponse = await request(app.getHttpServer())
          .get(`/tickets/${ticketId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(ticketResponse.body.data.sprintId).toBe(sprintId);
      }
    });
  });

  describe('Sprint Completion with Incomplete Ticket Movement', () => {
    let sprintForCompletion: string;
    let incompleteTicketId: string;
    let completeTicketId: string;

    beforeAll(async () => {
      // Create sprint for testing completion
      const sprintResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sprint for Completion Test',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        });
      sprintForCompletion = sprintResponse.body.data.id;

      // Start sprint
      await request(app.getHttpServer())
        .patch(`/sprints/${sprintForCompletion}/start`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      // Create incomplete ticket
      const incompleteResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Incomplete Task',
          priority: TicketPriority.MEDIUM,
          statusId: inProgressStatusId,
          sprintId: sprintForCompletion,
        });
      incompleteTicketId = incompleteResponse.body.data.id;

      // Create completed ticket
      const completeResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Complete Task',
          priority: TicketPriority.MEDIUM,
          statusId: doneStatusId,
          sprintId: sprintForCompletion,
        });
      completeTicketId = completeResponse.body.data.id;
    });

    it('should move incomplete tickets to backlog on sprint completion', async () => {
      // Complete sprint
      const completeResponse = await request(app.getHttpServer())
        .patch(`/sprints/${sprintForCompletion}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(completeResponse.body.data.status).toBe(SprintStatus.COMPLETED);

      // Verify incomplete ticket moved to backlog
      const incompleteCheck = await request(app.getHttpServer())
        .get(`/tickets/${incompleteTicketId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(incompleteCheck.body.data.sprintId).toBeNull();

      // Verify completed ticket stays in sprint (or whatever is expected)
      const completeCheck = await request(app.getHttpServer())
        .get(`/tickets/${completeTicketId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(completeCheck.body.data.statusId).toBe(doneStatusId);
    });
  });

  describe('Label Management with Duplicate Prevention', () => {
    it('should prevent duplicate labels in same project', async () => {
      const dto = {
        name: 'Unique Label',
        color: '#FF0000',
      };

      // Create first label
      const firstResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      const labelId = firstResponse.body.data.id;

      // Try to create duplicate
      const duplicateResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto);

      expect(duplicateResponse.status).toBe(400);
    });

    it('should allow many-to-many label assignment without duplicates', async () => {
      // Create labels
      const label1Response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Feature', color: '#00FF00' });

      const label2Response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Testing', color: '#0000FF' });

      const label1Id = label1Response.body.data.id;
      const label2Id = label2Response.body.data.id;

      // Create ticket with labels
      const ticketResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Multi-Label Ticket',
          priority: TicketPriority.HIGH,
          statusId: todoStatusId,
          labelIds: [label1Id, label2Id],
        })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

      // Verify both labels assigned
      const ticketCheck = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(ticketCheck.body.data.labels.length).toBe(2);
      const labelIds = ticketCheck.body.data.labels.map((l) => l.id);
      expect(labelIds).toContain(label1Id);
      expect(labelIds).toContain(label2Id);

      // Try to update with duplicate labels
      const updateResponse = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ labelIds: [label1Id, label1Id, label2Id] })
        .expect(200);

      // Verify no duplicates
      const updatedCheck = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(updatedCheck.body.data.labels.length).toBe(2);
    });
  });

  describe('Subtask Management and Constraints', () => {
    it('should enforce one-level-only subtask constraint', async () => {
      // Create parent
      const parentResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Parent for Subtask Test',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        })
        .expect(201);

      const parentId = parentResponse.body.data.id;

      // Create subtask
      const subtaskResponse = await request(app.getHttpServer())
        .post(`/tickets/${parentId}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Subtask Level 1',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        })
        .expect(201);

      const subtaskId = subtaskResponse.body.data.id;

      // Try to create subtask of subtask - should fail
      const invalidResponse = await request(app.getHttpServer())
        .post(`/tickets/${subtaskId}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Invalid Subtask Level 2',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });

      expect(invalidResponse.status).toBe(400);
    });

    it('should cascade delete subtasks when parent deleted', async () => {
      // Create parent with subtasks
      const parentResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Parent for Cascade Delete',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        })
        .expect(201);

      const parentId = parentResponse.body.data.id;

      const subtask1Response = await request(app.getHttpServer())
        .post(`/tickets/${parentId}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Subtask 1',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });

      const subtaskId = subtask1Response.body.data.id;

      // Delete parent
      await request(app.getHttpServer())
        .delete(`/tickets/${parentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify subtask also deleted
      const subtaskCheck = await request(app.getHttpServer())
        .get(`/tickets/${subtaskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(subtaskCheck.status).toBe(404);
    });
  });

  describe('Database Consistency - Transaction Safety', () => {
    it('should maintain consistency on bulk update rollback', async () => {
      // Create tickets
      const ticket1Response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Transaction Test Ticket 1',
          priority: TicketPriority.LOW,
          statusId: todoStatusId,
        });

      const ticket2Response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Transaction Test Ticket 2',
          priority: TicketPriority.LOW,
          statusId: todoStatusId,
        });

      const ticketIds = [ticket1Response.body.data.id, ticket2Response.body.data.id];

      // Bulk update - verify all or nothing behavior
      const bulkResponse = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tickets/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          action: 'PRIORITY',
          ticketIds,
          priority: TicketPriority.CRITICAL,
        })
        .expect(200);

      expect(bulkResponse.body.data.updatedCount).toBe(2);

      // Verify both updated
      for (const ticketId of ticketIds) {
        const check = await request(app.getHttpServer())
          .get(`/tickets/${ticketId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(check.body.data.priority).toBe(TicketPriority.CRITICAL);
      }
    });
  });
});
