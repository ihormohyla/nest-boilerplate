import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';

import {
  createTestApp,
  createDatabaseCleanupHelper,
  DatabaseCleanupHelper,
  getAuthTokens,
  registerUser,
  DEFAULT_PASSWORD,
  buildTestEmail,
} from '../../helpers';

const logger = new Logger('FilesE2E');

describe('FilesController (e2e)', () => {
  let app: INestApplication;
  let cleanupHelper: DatabaseCleanupHelper;
  let userToken: string;
  let userHeaders: { Authorization: string };

  beforeAll(async () => {
    app = await createTestApp();
    cleanupHelper = createDatabaseCleanupHelper(app);

    // Clean up any existing test data before starting
    try {
      await cleanupHelper.cleanAllTestData();
    } catch (error) {
      // Ignore cleanup errors if data doesn't exist
      logger.warn('Cleanup warning while preparing Files E2E tests', error as Error);
    }

    // Create a user for file operations
    const fileUserEmail = buildTestEmail('fileuser');
    await registerUser(app, {
      email: fileUserEmail,
      password: DEFAULT_PASSWORD,
    });
    const tokens = await getAuthTokens(app, {
      email: fileUserEmail,
      password: DEFAULT_PASSWORD,
    });
    userToken = tokens.accessToken;
    userHeaders = { Authorization: `Bearer ${userToken}` };
  });

  afterAll(async () => {
    // Clean up test data before closing app
    if (cleanupHelper) {
      try {
        await cleanupHelper.cleanAllTestData();
      } catch (error) {
        logger.error('Failed to clean up test data after Files E2E tests', error as Error);
      }
    }
    if (app) {
      await app.close();
    }
  });

  describe('/api/v1/files/presign (POST)', () => {
    it('should create presigned URL for file upload', () => {
      const fileData = {
        fileName: 'test-file.jpg',
        contentType: 'image/jpeg',
        directory: 'test',
      };

      return request(app.getHttpServer())
        .post('/api/v1/files/presign')
        .set(userHeaders)
        .send(fileData)
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('uploadUrl');
          expect(res.body.data).toHaveProperty('key');
          expect(res.body.data).toHaveProperty('fileId');
          expect(typeof res.body.data.uploadUrl).toBe('string');
          expect(typeof res.body.data.key).toBe('string');
          expect(typeof res.body.data.fileId).toBe('number');
        });
    });

    it('should create presigned URL without directory', () => {
      const fileData = {
        fileName: 'test-file.png',
        contentType: 'image/png',
      };

      return request(app.getHttpServer())
        .post('/api/v1/files/presign')
        .set(userHeaders)
        .send(fileData)
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('uploadUrl');
          expect(res.body.data).toHaveProperty('key');
          expect(res.body.data).toHaveProperty('fileId');
        });
    });

    it('should not create presigned URL without authentication', () => {
      const fileData = {
        fileName: 'test-file.jpg',
        contentType: 'image/jpeg',
      };

      return request(app.getHttpServer()).post('/api/v1/files/presign').send(fileData).expect(401);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/files/presign')
        .set(userHeaders)
        .send({
          fileName: 'test-file.jpg',
          // Missing contentType
        })
        .expect(400);
    });
  });

  describe('/api/v1/files/:id/confirm (PATCH)', () => {
    let fileId: number;

    beforeAll(async () => {
      // Create a presigned URL first
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presign')
        .set(userHeaders)
        .send({
          fileName: 'confirm-test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);
      fileId = response.body.data.fileId;
    });

    it('should confirm file upload', () => {
      const confirmData = {
        url: 'https://example.com/file.jpg',
        size: 1024,
        isUsed: true,
      };

      return request(app.getHttpServer())
        .patch(`/api/v1/files/${fileId}/confirm`)
        .set(userHeaders)
        .send(confirmData)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id', fileId);
          expect(res.body.data).toHaveProperty('status', 'COMPLETED');
          expect(res.body.data).toHaveProperty('url', confirmData.url);
          expect(res.body.data).toHaveProperty('size', confirmData.size);
          expect(res.body.data).toHaveProperty('isUsed', confirmData.isUsed);
        });
    });

    it('should confirm file upload with minimal data', () => {
      // Create another presigned URL
      return request(app.getHttpServer())
        .post('/api/v1/files/presign')
        .set(userHeaders)
        .send({
          fileName: 'minimal-confirm.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201)
        .then((presignRes: request.Response) => {
          const newFileId = presignRes.body.data.fileId;
          return request(app.getHttpServer())
            .patch(`/api/v1/files/${newFileId}/confirm`)
            .set(userHeaders)
            .send({
              size: 2048,
            })
            .expect(200)
            .expect((res: request.Response) => {
              expect(res.body).toHaveProperty('data');
              expect(res.body.data).toHaveProperty('id', newFileId);
              expect(res.body.data).toHaveProperty('status', 'COMPLETED');
            });
        });
    });

    it('should not confirm file upload for non-existent file', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/files/99999/confirm')
        .set(userHeaders)
        .send({
          size: 1024,
        })
        .expect(404);
    });

    it('should not confirm file upload without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/files/${fileId}/confirm`)
        .send({
          size: 1024,
        })
        .expect(401);
    });
  });

  describe('/api/v1/files/:key (DELETE)', () => {
    it('should delete file by key', async () => {
      // Create a file and confirm it
      const presignResponse = await request(app.getHttpServer())
        .post('/api/v1/files/presign')
        .set(userHeaders)
        .send({
          fileName: 'delete-test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const fileKey = presignResponse.body.data.key;
      const fileId = presignResponse.body.data.fileId;

      // Confirm the file
      await request(app.getHttpServer())
        .patch(`/api/v1/files/${fileId}/confirm`)
        .set(userHeaders)
        .send({
          size: 1024,
        })
        .expect(200);

      // Delete the file
      // URL encode the key in case it contains special characters
      const encodedKey = encodeURIComponent(fileKey);
      return request(app.getHttpServer())
        .delete(`/api/v1/files/${encodedKey}`)
        .set(userHeaders)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('success', true);
        });
    });

    it('should not delete non-existent file', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/files/non-existent-key')
        .set(userHeaders)
        .expect(404);
    });

    it('should not delete file without authentication', async () => {
      // Create a file first
      const presignResponse = await request(app.getHttpServer())
        .post('/api/v1/files/presign')
        .set(userHeaders)
        .send({
          fileName: 'delete-auth-test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const fileKey = presignResponse.body.data.key;
      const encodedKey = encodeURIComponent(fileKey);

      // Try to delete without authentication
      return request(app.getHttpServer()).delete(`/api/v1/files/${encodedKey}`).expect(401);
    });
  });
});
