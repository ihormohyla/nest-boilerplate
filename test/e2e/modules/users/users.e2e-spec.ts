import { INestApplication, Logger } from '@nestjs/common';
import { AppRole } from 'src/common/decorators/roles.decorator';
import request from 'supertest';

import {
  createTestApp,
  createDatabaseCleanupHelper,
  DatabaseCleanupHelper,
  getAuthTokens,
  loginUser,
  registerUser,
  DEFAULT_PASSWORD,
  TEST_USERS,
  TEST_USER_NAMES,
  TEST_PASSWORDS,
  buildTestEmail,
} from '../../helpers';

const logger = new Logger('UsersE2E');

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let cleanupHelper: DatabaseCleanupHelper;
  let adminToken: string;
  let managerToken: string;
  let userToken: string;
  let adminHeaders: { Authorization: string };
  let managerHeaders: { Authorization: string };
  let userHeaders: { Authorization: string };
  let userEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    cleanupHelper = createDatabaseCleanupHelper(app);

    // Clean up any existing test data before starting
    await cleanupHelper.cleanAllTestData();

    // Create admin user
    const adminUser = TEST_USERS.admin;
    await registerUser(app, adminUser);
    const adminTokens = await getAuthTokens(app, {
      email: adminUser.email,
      password: adminUser.password,
    });
    adminToken = adminTokens.accessToken;
    adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Create manager user
    const managerUser = TEST_USERS.manager;
    await registerUser(app, managerUser);
    const managerTokens = await getAuthTokens(app, {
      email: managerUser.email,
      password: managerUser.password,
    });
    managerToken = managerTokens.accessToken;
    managerHeaders = { Authorization: `Bearer ${managerToken}` };

    // Create regular user
    const regularUser = TEST_USERS.user;
    userEmail = regularUser.email;
    await registerUser(app, regularUser);
    const userTokens = await getAuthTokens(app, {
      email: regularUser.email,
      password: regularUser.password,
    });
    userToken = userTokens.accessToken;
    userHeaders = { Authorization: `Bearer ${userToken}` };
  });

  afterAll(async () => {
    // Clean up test data before closing app
    try {
      await cleanupHelper.cleanAllTestData();
    } catch (error) {
      logger.error('Failed to clean up test data after Users E2E tests', error as Error);
      // Don't throw - continue with app.close() even if cleanup fails
    }
    if (app) {
      await app.close();
    }
  });

  describe('/api/v1/users (POST)', () => {
    it('should create user as admin', () => {
      const userData = {
        email: buildTestEmail('newuser'),
        password: DEFAULT_PASSWORD,
        firstName: TEST_USER_NAMES.NEW.firstName,
        lastName: TEST_USER_NAMES.NEW.lastName,
        role: AppRole.USER,
      };

      return request(app.getHttpServer())
        .post('/api/v1/users')
        .set(adminHeaders)
        .send(userData)
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email', userData.email);
          expect(res.body.data).toHaveProperty('firstName', userData.firstName);
          expect(res.body.data).toHaveProperty('lastName', userData.lastName);
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it('should allow admin-created user to log in with provided password', async () => {
      const uniqueEmail = buildTestEmail('admincreated');

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(adminHeaders)
        .send({
          email: uniqueEmail,
          password: TEST_PASSWORDS.ADMIN_CREATED,
          role: AppRole.USER,
        })
        .expect(201);

      const tokens = await getAuthTokens(app, {
        email: uniqueEmail,
        password: TEST_PASSWORDS.ADMIN_CREATED,
      });

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
    });

    it('should not create user as manager', () => {
      const userData = {
        email: buildTestEmail('managercreated'),
        password: DEFAULT_PASSWORD,
      };

      return request(app.getHttpServer())
        .post('/api/v1/users')
        .set(managerHeaders)
        .send(userData)
        .expect(403);
    });

    it('should not create user as regular user', () => {
      const userData = {
        email: buildTestEmail('usercreated'),
        password: DEFAULT_PASSWORD,
      };

      return request(app.getHttpServer())
        .post('/api/v1/users')
        .set(userHeaders)
        .send(userData)
        .expect(403);
    });

    it('should not create user without authentication', () => {
      const userData = {
        email: buildTestEmail('noauth'),
        password: DEFAULT_PASSWORD,
      };

      return request(app.getHttpServer()).post('/api/v1/users').send(userData).expect(401);
    });
  });

  describe('/api/v1/users (GET)', () => {
    it('should get all users as admin with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .set(adminHeaders)
        .expect(200)
        .expect((res: request.Response) => {
          // Paginated responses are not wrapped by TransformInterceptor
          // Structure: { data: [...], meta: {...} }
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);

          // Check pagination metadata
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('totalPages');
          expect(res.body.meta).toHaveProperty('hasNextPage');
          expect(res.body.meta).toHaveProperty('hasPreviousPage');

          // Check user properties
          res.body.data.forEach((user: any) => {
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('email');
            expect(user).not.toHaveProperty('password');
          });
        });
    });

    it('should get all users as manager with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .set(managerHeaders)
        .expect(200)
        .expect((res: request.Response) => {
          // Paginated responses are not wrapped by TransformInterceptor
          // Structure: { data: [...], meta: {...} }
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should support pagination query parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users?page=1&limit=2')
        .set(adminHeaders)
        .expect(200)
        .expect((res: request.Response) => {
          // Paginated responses are not wrapped by TransformInterceptor
          // Structure: { data: [...], meta: {...} }
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(2);
          expect(res.body.data.length).toBeLessThanOrEqual(2);
        });
    });

    it('should not get all users as regular user', () => {
      return request(app.getHttpServer()).get('/api/v1/users').set(userHeaders).expect(403);
    });
  });

  describe('/api/v1/users/me (GET)', () => {
    it('should get current user profile', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set(userHeaders)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email', userEmail);
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it('should not get profile without authentication', () => {
      return request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('/api/v1/users/:id (GET)', () => {
    let userId: number;

    beforeAll(async () => {
      // Create a user to test with
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(adminHeaders)
        .send({
          email: buildTestEmail('testuser'),
          password: DEFAULT_PASSWORD,
          firstName: TEST_USER_NAMES.TEST.firstName,
          lastName: TEST_USER_NAMES.TEST.lastName,
        })
        .expect(201);
      userId = createResponse.body.data.id;
    });

    it('should get user by id as admin', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set(adminHeaders)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', userId);
          expect(res.body.data).toHaveProperty('email');
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it('should get user by id as manager', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set(managerHeaders)
        .expect(200);
    });

    it('should not get user by id as regular user', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set(userHeaders)
        .expect(403);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer()).get('/api/v1/users/99999').set(adminHeaders).expect(404);
    });
  });

  describe('/api/v1/users/:id (PATCH)', () => {
    let userId: number;

    beforeAll(async () => {
      // Create a user to update
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(adminHeaders)
        .send({
          email: buildTestEmail('toupdate'),
          password: DEFAULT_PASSWORD,
          firstName: TEST_USER_NAMES.TO_UPDATE.firstName,
          lastName: TEST_USER_NAMES.TO_UPDATE.lastName,
        })
        .expect(201);
      userId = response.body.data.id;
    });

    it('should update user as admin', () => {
      const updateData = {
        firstName: TEST_USER_NAMES.UPDATED.firstName,
        lastName: TEST_USER_NAMES.UPDATED.lastName,
      };

      return request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set(adminHeaders)
        .send(updateData)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', userId);
          expect(res.body.data).toHaveProperty('firstName', updateData.firstName);
          expect(res.body.data).toHaveProperty('lastName', updateData.lastName);
        });
    });

    it('should not update user as manager', () => {
      const updateData = {
        firstName: TEST_USER_NAMES.MANAGER.firstName,
      };

      return request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set(managerHeaders)
        .send(updateData)
        .expect(403);
    });

    it('should allow admin to rotate user password and authenticate with the new one', async () => {
      const newUserEmail = buildTestEmail('resettable');

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(adminHeaders)
        .send({
          email: newUserEmail,
          password: TEST_PASSWORDS.INITIAL,
        })
        .expect(201);

      const createdUserId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${createdUserId}`)
        .set(adminHeaders)
        .send({
          password: TEST_PASSWORDS.UPDATED,
        })
        .expect(200);

      // Old password should fail
      const oldPasswordLogin = await loginUser(app, {
        email: newUserEmail,
        password: TEST_PASSWORDS.INITIAL,
      });
      expect(oldPasswordLogin.status).toBe(401);

      // New password should succeed
      const tokens = await getAuthTokens(app, {
        email: newUserEmail,
        password: TEST_PASSWORDS.UPDATED,
      });
      expect(tokens).toHaveProperty('accessToken');
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/users/99999')
        .set(adminHeaders)
        .send({ firstName: TEST_USER_NAMES.TEST.firstName })
        .expect(404);
    });
  });

  describe('/api/v1/users/:id (DELETE)', () => {
    let userId: number;
    let deleteUserEmail: string;

    beforeEach(async () => {
      // Create a user to delete before each test
      deleteUserEmail = buildTestEmail('todelete');
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(adminHeaders)
        .send({
          email: deleteUserEmail,
          password: DEFAULT_PASSWORD,
        })
        .expect(201);
      userId = response.body.data.id;
    });

    afterEach(async () => {
      // Clean up user created in beforeEach if it still exists
      // This ensures users are deleted even if the test doesn't delete them
      if (deleteUserEmail) {
        try {
          // Use a small delay to ensure any transactions are committed
          await new Promise((resolve) => setTimeout(resolve, 100));

          const deleted = await cleanupHelper.cleanUserData(deleteUserEmail, { force: true });
          if (!deleted) {
            // User was not found - might have been already deleted by the test
            // This is expected for tests that delete the user
            if (process.env.DEBUG) {
              logger.log(
                `User ${deleteUserEmail} was not found during cleanup (likely already deleted)`,
              );
            }
          } else {
            // Verify user was actually deleted
            if (process.env.DEBUG) {
              logger.log(`Successfully cleaned up user ${deleteUserEmail} in afterEach`);
            }
          }
        } catch (error) {
          // Log error but don't fail the test
          // The user might have been already deleted or there might be a cleanup issue
          logger.error(`Failed to clean up user ${deleteUserEmail} in afterEach`, error as Error);
        }
      }
    });

    it('should delete user as admin', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set(adminHeaders)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('success', true);
        });
    });

    it('should not delete user as manager', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set(managerHeaders)
        .expect(403);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/users/99999')
        .set(adminHeaders)
        .expect(404);
    });
  });
});
