import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from '../../helpers';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/health (GET)', () => {
    it('should return health check status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('timestamp');
          expect(typeof res.body.uptime).toBe('number');
          expect(typeof res.body.timestamp).toBe('string');
        });
    });
  });
});
