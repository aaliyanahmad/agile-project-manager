import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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

const mockJwtService = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
});

describe('AuthService (Unit)', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useFactory: mockRepository,
        },
        {
          provide: JwtService,
          useFactory: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  describe('signup', () => {
    it('should create a new user and return access token', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: dto.name,
        passwordHash: 'hashed_password',
        createdAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token_123');

      const result = await service.signup(dto);

      expect(result.access_token).toBe('token_123');
      expect(result.user.email).toBe(dto.email);
      expect(result.user.name).toBe(dto.name);
    });

    it('should throw if user already exists', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      userRepository.findOne.mockResolvedValue({ id: 'user-123' });

      await expect(service.signup(dto)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: 'Test User',
        passwordHash: await bcrypt.hash(dto.password, 10),
      };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token_123');

      const result = await service.login(dto);

      expect(result.access_token).toBe('token_123');
      expect(result.user.email).toBe(dto.email);
    });

    it('should throw for invalid password', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      const mockUser = {
        id: 'user-123',
        email: dto.email,
        passwordHash: await bcrypt.hash('correct_password', 10),
      };

      userRepository.findOneBy.mockResolvedValue(mockUser);

      await expect(service.login(dto)).rejects.toThrow();
    });

    it('should throw for non-existent user', async () => {
      const dto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow();
    });
  });

  describe('validateUser', () => {
    it('should return user if exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('user-123');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
