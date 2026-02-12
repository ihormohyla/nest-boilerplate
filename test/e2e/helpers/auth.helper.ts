import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppRole } from '../../../src/common/decorators/roles.decorator';

export interface RegisterUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: AppRole;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function registerUser(
  app: INestApplication,
  userData: RegisterUserDto,
): Promise<request.Response> {
  return request(app.getHttpServer()).post('/api/v1/auth/register').send(userData);
}

export async function loginUser(
  app: INestApplication,
  credentials: LoginUserDto,
): Promise<request.Response> {
  return request(app.getHttpServer()).post('/api/v1/auth/login').send(credentials);
}

export async function getAuthTokens(
  app: INestApplication,
  credentials: LoginUserDto,
): Promise<AuthTokens> {
  const response = await loginUser(app, credentials);
  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('data');
  expect(response.body.data).toHaveProperty('tokens');
  return response.body.data.tokens;
}

export async function getAuthHeaders(
  app: INestApplication,
  credentials: LoginUserDto,
): Promise<{ Authorization: string; Cookie?: string }> {
  const tokens = await getAuthTokens(app, credentials);
  return {
    Authorization: `Bearer ${tokens.accessToken}`,
  };
}

export async function logoutUser(
  app: INestApplication,
  accessToken: string,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post('/api/v1/auth/logout')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({});
}

export async function getMe(app: INestApplication, accessToken: string): Promise<request.Response> {
  return request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);
}

export async function refreshToken(
  app: INestApplication,
  refreshToken: string,
): Promise<request.Response> {
  return request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken });
}
