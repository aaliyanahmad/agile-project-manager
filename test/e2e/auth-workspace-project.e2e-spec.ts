import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should register a new user', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer()).post('/auth/signup').send(dto).expect(201);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.user.email).toBe(dto.email);
      expect(response.body.user.name).toBe(dto.name);
    });

    it('should validate email format', async () => {
      const dto = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        name: 'Test User',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(dto).expect(400);
    });

    it('should reject duplicate email', async () => {
      const dto = {
        email: 'unique@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(dto).expect(201);

      // Try to register again with same email
      await request(app.getHttpServer()).post('/auth/signup').send(dto).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    let token: string;

    beforeAll(async () => {
      const signup = {
        email: 'login@example.com',
        password: 'SecurePassword123!',
        name: 'Login Test User',
      };

      const response = await request(app.getHttpServer()).post('/auth/signup').send(signup);
      token = response.body.access_token;
    });

    it('should login with valid credentials', async () => {
      const dto = {
        email: 'login@example.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer()).post('/auth/login').send(dto).expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.user.email).toBe(dto.email);
    });

    it('should reject invalid password', async () => {
      const dto = {
        email: 'login@example.com',
        password: 'WrongPassword',
      };

      await request(app.getHttpServer()).post('/auth/login').send(dto).expect(401);
    });

    it('should reject non-existent user', async () => {
      const dto = {
        email: 'nonexistent@example.com',
        password: 'AnyPassword',
      };

      await request(app.getHttpServer()).post('/auth/login').send(dto).expect(404);
    });
  });

  describe('GET /auth/me', () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const signup = {
        email: 'me@example.com',
        password: 'SecurePassword123!',
        name: 'Me User',
      };

      const response = await request(app.getHttpServer()).post('/auth/signup').send(signup);
      token = response.body.access_token;
      userId = response.body.user.id;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('me@example.com');
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });
});

describe('Workspace E2E', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'workspace@example.com',
      password: 'SecurePassword123!',
      name: 'Workspace User',
    };

    const response = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = response.body.access_token;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces', () => {
    it('should create workspace', async () => {
      const dto = { name: 'My First Workspace' };

      const response = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspace.name).toBe(dto.name);
      expect(response.body.data.role).toBe('ADMIN');
    });

    it('should not create duplicate workspace name', async () => {
      const dto = { name: 'Duplicate Workspace' };

      await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      // Try to create with same name
      await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('GET /workspaces', () => {
    it('should return user workspaces', async () => {
      const response = await request(app.getHttpServer())
        .get('/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });
  });
});

describe('Project E2E', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create user
    const signup = {
      email: 'project@example.com',
      password: 'SecurePassword123!',
      name: 'Project User',
    };

    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send(signup);
    token = signupResponse.body.access_token;
    userId = signupResponse.body.user.id;

    // Create workspace
    const wsResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Project Workspace' });

    workspaceId = wsResponse.body.data.workspace.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /workspaces/:id/projects', () => {
    it('should create project with default statuses', async () => {
      const dto = { name: 'My First Project' };

      const response = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe(dto.name);
      expect(response.body.data.project.key).toBeDefined();
    });

    it('should generate unique project key', async () => {
      const dto = { name: 'Key Test Project' };

      const response = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.data.project.key).toMatch(/^[A-Z]{1,4}$/);
    });

    it('should reject duplicate project name', async () => {
      const dto = { name: 'Duplicate Project' };

      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      // Try again
      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('GET /workspaces/:id/projects', () => {
    it('should list projects in workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });
  });
});
