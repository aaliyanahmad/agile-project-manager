import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TicketPriority, WorkspaceMemberRole, StatusCategory } from '../src/entities/enums';

describe('Integration Tests - Authorization & Access Control', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let otherUserToken: string;
  let workspaceId: string;
  let projectId: string;
  let todoStatusId: string;
  let adminUserId: string;
  let memberUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create admin user
    const adminSignup = {
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      name: 'Admin User',
    };

    const adminResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(adminSignup);
    adminToken = adminResponse.body.access_token;
    adminUserId = adminResponse.body.user.id;

    // Create member user
    const memberSignup = {
      email: 'member@example.com',
      password: 'MemberPassword123!',
      name: 'Member User',
    };

    const memberResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(memberSignup);
    memberToken = memberResponse.body.access_token;
    memberUserId = memberResponse.body.user.id;

    // Create other user (not in workspace)
    const otherSignup = {
      email: 'other@example.com',
      password: 'OtherPassword123!',
      name: 'Other User',
    };

    const otherResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(otherSignup);
    otherUserToken = otherResponse.body.access_token;
    otherUserId = otherResponse.body.user.id;

    // Create workspace as admin
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Authorization Test Workspace' });
    workspaceId = wsResponse.body.data.workspace.id;

    // Add member to workspace
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: memberUserId,
        role: WorkspaceMemberRole.MEMBER,
      });

    // Create project as admin
    const projResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Authorization Test Project' });
    projectId = projResponse.body.data.project.id;

    // Get status
    const statusResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`);
    todoStatusId = statusResponse.body.items.find(
      (s) => s.category === StatusCategory.TODO,
    )?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Workspace Isolation', () => {
    it('should prevent non-member from viewing workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should prevent non-member from accessing projects in workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should prevent non-member from creating tickets in project', async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'Unauthorized Ticket',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Member Permissions', () => {
    let ticketId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Member Permission Test Ticket',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });
      ticketId = response.body.data.id;
    });

    it('should allow member to view tickets', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(ticketId);
    });

    it('should allow member to create tickets', async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Member Created Ticket',
          priority: TicketPriority.LOW,
          statusId: todoStatusId,
        })
        .expect(201);

      expect(response.body.data.id).toBeDefined();
    });

    it('should allow member to update tickets', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ priority: TicketPriority.HIGH })
        .expect(200);

      expect(response.body.data.priority).toBe(TicketPriority.HIGH);
    });

    it('should allow member to delete tickets', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Delete Test Ticket',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/tickets/${createResponse.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
    });
  });

  describe('Admin-Only Operations', () => {
    it('should prevent member from adding workspace members', async () => {
      const anotherUserSignup = {
        email: 'another@example.com',
        password: 'AnotherPassword123!',
        name: 'Another User',
      };

      const anotherResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(anotherUserSignup);
      const anotherUserId = anotherResponse.body.user.id;

      const response = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          userId: anotherUserId,
          role: WorkspaceMemberRole.MEMBER,
        });

      expect([403, 400]).toContain(response.status);
    });

    it('should allow admin to add workspace members', async () => {
      const newUserSignup = {
        email: 'newmember@example.com',
        password: 'NewMemberPassword123!',
        name: 'New Member',
      };

      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(newUserSignup);
      const newUserId = newUserResponse.body.user.id;

      const response = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          role: WorkspaceMemberRole.MEMBER,
        })
        .expect(201);

      expect(response.body.data.role).toBe(WorkspaceMemberRole.MEMBER);
    });
  });

  describe('Comment Author-Only Operations', () => {
    let commentId: string;
    let ticketId: string;

    beforeAll(async () => {
      // Create ticket
      const ticketResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Comment Test Ticket',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });
      ticketId = ticketResponse.body.data.id;

      // Admin adds comment
      const commentResponse = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Admin comment' });
      commentId = commentResponse.body.data.id;
    });

    it('should prevent non-author from editing comment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ content: 'Modified by member' });

      expect(response.status).toBe(403);
    });

    it('should prevent non-author from deleting comment', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow author to edit own comment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Updated by author' })
        .expect(200);

      expect(response.body.data.content).toBe('Updated by author');
    });

    it('should allow author to delete own comment', async () => {
      // Create new comment for deletion
      const newCommentResponse = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'To be deleted' });

      const newCommentId = newCommentResponse.body.data.id;

      // Delete as author
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/comments/${newCommentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
    });
  });

  describe('Token-Based Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app.getHttpServer()).get(`/workspaces/${workspaceId}`);

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', 'InvalidHeader');

      expect(response.status).toBe(401);
    });
  });

  describe('Cross-Workspace Data Isolation', () => {
    let otherWorkspaceId: string;
    let otherProjectId: string;

    beforeAll(async () => {
      // Create another workspace with other user
      const wsResponse = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Other User Workspace' });
      otherWorkspaceId = wsResponse.body.data.workspace.id;

      // Create project in other workspace
      const projResponse = await request(app.getHttpServer())
        .post(`/workspaces/${otherWorkspaceId}/projects`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Other User Project' });
      otherProjectId = projResponse.body.data.project.id;
    });

    it('should prevent member from accessing another workspace project', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${otherProjectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should prevent member from creating tickets in another workspace project', async () => {
      // Get status from other project first
      const statusResponse = await request(app.getHttpServer())
        .get(`/projects/${otherProjectId}/statuses`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      const statusId = statusResponse.body.items[0]?.id;

      const response = await request(app.getHttpServer())
        .post(`/projects/${otherProjectId}/tickets`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Unauthorized Cross-Workspace Ticket',
          priority: TicketPriority.MEDIUM,
          statusId,
        });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Activity Log Access Control', () => {
    let ticketId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tickets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Activity Log Access Test',
          priority: TicketPriority.MEDIUM,
          statusId: todoStatusId,
        });
      ticketId = response.body.data.id;
    });

    it('should allow member to view activity logs within workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/activity`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should prevent non-member from viewing activity logs', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/activity`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });
});
