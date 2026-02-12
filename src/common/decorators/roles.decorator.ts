import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export enum AppRole {
  ADMIN = 1,
  MANAGER = 2,
  USER = 3,
}

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
