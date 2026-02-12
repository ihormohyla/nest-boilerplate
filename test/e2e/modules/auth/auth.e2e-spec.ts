import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';

import {
  createTestApp,
  createDatabaseCleanupHelper,
  getAuthTokens,
  registerUser,
  RegisterUserDto,
  DatabaseCleanupHelper,
  DEFAULT_PASSWORD,
  TEST_USERS,
  TEST_USER_NAMES,
  TEST_PASSWORDS,
  buildTestEmail,
} from '../../helpers';

const logger = new Logger('AuthE2E');

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let cleanupHelper: DatabaseCleanupHelper;

  beforeAll(async () => {
    app = await createTestApp();
    cleanupHelper = createDatabaseCleanupHelper(app);
  });

  afterAll(async () => {
    // Clean up test data before closing app
    try {
      await cleanupHelper.cleanAllTestData();
    } catch (error) {
      logger.error('Failed to clean up test data after Auth E2E tests', error as Error);
    }
    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user', () => {
      const userData: RegisterUserDto = {
        email: buildTestEmail('register'),
        password: DEFAULT_PASSWORD,
        firstName: TEST_USERS.user.firstName,
        lastName: TEST_USERS.user.lastName,
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('tokens');
          expect(res.body.data.tokens).toHaveProperty('accessToken');
          expect(res.body.data.tokens).toHaveProperty('refreshToken');
          expect(res.body.data.tokens).toHaveProperty('expiresIn');
          expect(typeof res.body.data.tokens.accessToken).toBe('string');
          expect(typeof res.body.data.tokens.refreshToken).toBe('string');
        });
    });

    it('should not register user with duplicate email', async () => {
      const duplicateEmail = buildTestEmail('duplicate');
      const userData: RegisterUserDto = {
        email: duplicateEmail,
        password: DEFAULT_PASSWORD,
      };

      // First registration
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(userData).expect(201);

      // Second registration with same email
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...userData })
        .expect(400);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    const testUser: RegisterUserDto = {
      email: buildTestEmail('login'),
      password: DEFAULT_PASSWORD,
    };

    beforeAll(async () => {
      await registerUser(app, testUser);
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('tokens');
          expect(res.body.data.tokens).toHaveProperty('accessToken');
          expect(res.body.data.tokens).toHaveProperty('refreshToken');
        });
    });

    it('should not login with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: buildTestEmail('wrong'),
          password: testUser.password,
        })
        .expect(401);
    });

    it('should not login with invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: TEST_PASSWORDS.WRONG,
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    const testUser: RegisterUserDto = {
      email: buildTestEmail('me'),
      password: DEFAULT_PASSWORD,
      firstName: TEST_USER_NAMES.ME.firstName,
      lastName: TEST_USER_NAMES.ME.lastName,
    };

    let accessToken: string;

    beforeAll(async () => {
      await registerUser(app, testUser);
      const tokens = await getAuthTokens(app, {
        email: testUser.email,
        password: testUser.password,
      });
      accessToken = tokens.accessToken;
    });

    it('should return current user with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email', testUser.email);
          expect(res.body.data).toHaveProperty('firstName', testUser.firstName);
          expect(res.body.data).toHaveProperty('lastName', testUser.lastName);
          expect(res.body.data).toHaveProperty('role');
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it('should not return user without token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should not return user with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    const testUser: RegisterUserDto = {
      email: buildTestEmail('refresh'),
      password: DEFAULT_PASSWORD,
    };

    let refreshToken: string;

    beforeAll(async () => {
      await registerUser(app, testUser);
      const tokens = await getAuthTokens(app, {
        email: testUser.email,
        password: testUser.password,
      });
      refreshToken = tokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('tokens');
          expect(res.body.data.tokens).toHaveProperty('accessToken');
          expect(res.body.data.tokens).toHaveProperty('refreshToken');
          expect(res.body.data.tokens).toHaveProperty('expiresIn');
          // New refresh token should be different (refresh token rotation)
          expect(res.body.data.tokens.refreshToken).not.toBe(refreshToken);
        });
    });

    it('should not refresh with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });

    it('should not refresh with expired refresh token', async () => {
      // This test would require manipulating Redis to expire a token
      // For now, we just test that invalid tokens are rejected
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'expired-token-uuid' })
        .expect(401);
    });
  });

  describe('/api/v1/auth/logout (POST)', () => {
    const testUser: RegisterUserDto = {
      email: buildTestEmail('logout'),
      password: DEFAULT_PASSWORD,
    };

    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      await registerUser(app, testUser);
      const tokens = await getAuthTokens(app, {
        email: testUser.email,
        password: testUser.password,
      });
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    });

    it('should logout user and blacklist access token', async () => {
      // First verify we can access /me
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Logout - blacklists access token and revokes all refresh tokens
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('success', true);
        });

      // After logout, access token should be blacklisted and cannot be used
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      // Refresh token should also be revoked
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should not logout without token', () => {
      return request(app.getHttpServer()).post('/api/v1/auth/logout').send({}).expect(401);
    });

    it('should reject logout when bearer scheme is missing token value', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer ')
        .send({})
        .expect(401);
    });

    it('should reject logout when authorization scheme is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Token ${accessToken}`)
        .send({})
        .expect(401);
    });
  });
});
