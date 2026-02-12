import { AppRole } from '../../src/common/decorators/roles.decorator';

export const DEFAULT_TEST_EMAIL_DOMAIN = 'example.com';
export const DEFAULT_PASSWORD = 'Password123!';

// Additional test passwords for password rotation/update tests
export const TEST_PASSWORDS = Object.freeze({
  ADMIN_CREATED: 'AdminCreate123!',
  INITIAL: 'InitialPass123!',
  UPDATED: 'NewPass456!',
  WRONG: 'wrongpassword',
});

// Common test user names
export const TEST_USER_NAMES = Object.freeze({
  NEW: Object.freeze({
    firstName: 'New',
    lastName: 'User',
  }),
  TEST: Object.freeze({
    firstName: 'Test',
    lastName: 'User',
  }),
  TO_UPDATE: Object.freeze({
    firstName: 'To',
    lastName: 'Update',
  }),
  UPDATED: Object.freeze({
    firstName: 'Updated',
    lastName: 'Name',
  }),
  ME: Object.freeze({
    firstName: 'Me',
    lastName: 'User',
  }),
  MANAGER: Object.freeze({
    firstName: 'Manager',
    lastName: 'User',
  }),
});

const BASE_TIMESTAMP = Date.now();
const buildStaticEmail = (prefix: string, domain: string = DEFAULT_TEST_EMAIL_DOMAIN) =>
  `${prefix}-${BASE_TIMESTAMP}@${domain}`;

export const TEST_USERS = Object.freeze({
  admin: Object.freeze({
    email: buildStaticEmail('admin'),
    password: DEFAULT_PASSWORD,
    role: AppRole.ADMIN,
    firstName: 'Admin',
    lastName: 'User',
  }),
  manager: Object.freeze({
    email: buildStaticEmail('manager'),
    password: DEFAULT_PASSWORD,
    role: AppRole.MANAGER,
    firstName: 'Manager',
    lastName: 'User',
  }),
  user: Object.freeze({
    email: buildStaticEmail('user'),
    password: DEFAULT_PASSWORD,
    role: AppRole.USER,
    firstName: 'Regular',
    lastName: 'User',
  }),
});

export const buildTestEmail = (prefix: string, domain: string = DEFAULT_TEST_EMAIL_DOMAIN) =>
  `${prefix}-${Date.now()}@${domain}`;
