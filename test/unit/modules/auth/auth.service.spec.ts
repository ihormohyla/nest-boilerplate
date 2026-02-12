import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AppRole } from '../../../../src/common/decorators/roles.decorator';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../../../../src/modules/auth/dto';
import { TokenService } from '../../../../src/modules/auth/services/token.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import {
  DEFAULT_PASSWORD,
  TEST_PASSWORDS,
  TEST_USER_NAMES,
  buildTestEmail,
} from '../../../constants/test-users.constant';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let tokenService: jest.Mocked<TokenService>;
  let configService: jest.Mocked<ConfigService>;

  const accessToken = 'access-token';
  const refreshToken = 'refresh-token';

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      toSafeEntity: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    tokenService = {
      generateAccessToken: jest.fn().mockResolvedValue(accessToken),
      generateRefreshToken: jest.fn().mockResolvedValue(refreshToken),
      verifyRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      logout: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'jwt.accessExpiresIn') {
          return '3600s';
        }
        return defaultValue as any;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new AuthService(usersService, tokenService, configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw if email already taken', async () => {
      const email = buildTestEmail('taken');
      usersService.findByEmail.mockResolvedValueOnce({ id: 1 } as any);

      await expect(
        service.register({ email, password: DEFAULT_PASSWORD } as RegisterDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should create user and return tokens', async () => {
      const email = buildTestEmail('new');
      usersService.findByEmail.mockResolvedValueOnce(null);
      usersService.create.mockResolvedValueOnce({ id: 1, role: AppRole.USER } as any);

      const result = await service.register({
        email,
        password: DEFAULT_PASSWORD,
        firstName: TEST_USER_NAMES.NEW.firstName,
        lastName: TEST_USER_NAMES.NEW.lastName,
      } as RegisterDto);

      expect(usersService.create).toHaveBeenCalledWith({
        email,
        password: DEFAULT_PASSWORD,
        firstName: TEST_USER_NAMES.NEW.firstName,
        lastName: TEST_USER_NAMES.NEW.lastName,
        role: AppRole.USER,
      });
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(1, AppRole.USER);
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(1, AppRole.USER, undefined);
      expect(result.tokens).toEqual({
        accessToken,
        refreshToken,
        expiresIn: 3600,
      });
    });

    it('should forward request metadata into token generation', async () => {
      const email = buildTestEmail('meta');
      usersService.findByEmail.mockResolvedValueOnce(null);
      usersService.create.mockResolvedValueOnce({ id: 2, role: AppRole.MANAGER } as any);
      const context = { ipAddress: '203.0.113.1', userAgent: 'unit-test' };

      await service.register({ email, password: DEFAULT_PASSWORD } as RegisterDto, context);

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(2, AppRole.MANAGER);
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(2, AppRole.MANAGER, context);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = { email: buildTestEmail('login'), password: DEFAULT_PASSWORD };

    it('should throw if user not found', async () => {
      usersService.findByEmail.mockResolvedValueOnce(null);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if password invalid', async () => {
      usersService.findByEmail.mockResolvedValueOnce({ password: 'hash' } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({ ...loginDto, password: TEST_PASSWORDS.WRONG }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should issue tokens when credentials valid', async () => {
      usersService.findByEmail.mockResolvedValueOnce({
        id: 1,
        role: AppRole.ADMIN,
        password: 'hash',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.login(loginDto);

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(1, AppRole.ADMIN);
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(1, AppRole.ADMIN, undefined);
      expect(result.tokens.accessToken).toBe(accessToken);
    });

    it('should pass metadata through when login succeeds', async () => {
      usersService.findByEmail.mockResolvedValueOnce({
        id: 4,
        role: AppRole.USER,
        password: 'hash',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      const metadata = { ipAddress: '10.0.0.2', userAgent: 'cli/1.0' };

      await service.login(loginDto, metadata);

      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(4, AppRole.USER, metadata);
    });
  });

  describe('refreshToken', () => {
    const dto: RefreshTokenDto = { refreshToken: 'incoming' };

    it('should throw if refresh token invalid', async () => {
      tokenService.verifyRefreshToken.mockResolvedValueOnce(null);

      await expect(service.refreshToken(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if user not found', async () => {
      tokenService.verifyRefreshToken.mockResolvedValueOnce({
        userId: 1,
        role: AppRole.USER,
      } as any);
      usersService.findOne.mockResolvedValueOnce(null as any);

      await expect(service.refreshToken(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should rotate tokens when refresh token valid', async () => {
      tokenService.verifyRefreshToken.mockResolvedValueOnce({
        userId: 1,
        role: AppRole.USER,
      } as any);
      usersService.findOne.mockResolvedValueOnce({ id: 1, role: AppRole.USER } as any);

      const result = await service.refreshToken(dto);

      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('incoming');
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(1, AppRole.USER, undefined);
      expect(result.tokens.refreshToken).toBe(refreshToken);
    });

    it('should include metadata when issuing rotated tokens', async () => {
      tokenService.verifyRefreshToken.mockResolvedValueOnce({
        userId: 3,
        role: AppRole.ADMIN,
      } as any);
      usersService.findOne.mockResolvedValueOnce({ id: 3, role: AppRole.ADMIN } as any);
      const context = { ipAddress: '198.51.100.5', userAgent: 'refresh-test' };

      await service.refreshToken({ refreshToken: 'rotate-me' }, context);

      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(3, AppRole.ADMIN, context);
    });
  });

  describe('logout', () => {
    it('should delegate to tokenService.logout', async () => {
      await expect(service.logout(1, 'token')).resolves.toEqual({ success: true });
      expect(tokenService.logout).toHaveBeenCalledWith(1, 'token');
    });
  });

  describe('me', () => {
    it('should return safe entity', async () => {
      const user = { id: 1 } as any;
      usersService.findOne.mockResolvedValueOnce(user);
      usersService.toSafeEntity.mockReturnValueOnce({ id: 1, email: 'safe@example.com' } as any);

      const result = await service.me(1);

      expect(usersService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, email: 'safe@example.com' });
    });
  });

  describe('token expiry calculation', () => {
    it('uses configured duration strings', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'jwt.accessExpiresIn') {
          return '2h';
        }
        return defaultValue as any;
      });
      usersService.findByEmail.mockResolvedValueOnce(null);
      usersService.create.mockResolvedValueOnce({ id: 11, role: AppRole.USER } as any);

      const email = buildTestEmail('time');
      const result = await service.register({ email, password: DEFAULT_PASSWORD } as RegisterDto);

      expect(result.tokens.expiresIn).toBe(7200);
    });

    it('falls back to numeric strings', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'jwt.accessExpiresIn') {
          return '900';
        }
        return defaultValue as any;
      });
      usersService.findByEmail.mockResolvedValueOnce(null);
      usersService.create.mockResolvedValueOnce({ id: 12, role: AppRole.USER } as any);

      const email = buildTestEmail('numeric');
      const result = await service.register({ email, password: DEFAULT_PASSWORD } as RegisterDto);

      expect(result.tokens.expiresIn).toBe(900);
    });
  });
});
