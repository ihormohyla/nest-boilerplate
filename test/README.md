# Test Structure

This directory contains all tests for the application, organized by test type and module structure.

## Directory Structure

```
test/
├── e2e/                    # End-to-end tests
│   ├── modules/            # Tests organized by module (mirrors src/modules/)
│   │   ├── auth/
│   │   │   └── auth.e2e-spec.ts
│   │   ├── files/
│   │   │   └── files.e2e-spec.ts
│   │   ├── health/
│   │   │   └── health.e2e-spec.ts
│   │   └── users/
│   │       └── users.e2e-spec.ts
│   └── helpers/            # E2E test helpers
│       ├── app.helper.ts   # Test app setup
│       ├── auth.helper.ts  # Authentication helpers
│       └── index.ts        # Barrel export
├── unit/                   # Unit tests (to be implemented)
│   └── modules/            # Unit tests organized by module
│       └── (future unit tests)
├── setup-tests.ts          # Global test setup
├── jest-e2e.json          # E2E test configuration
├── jest-unit.json         # Unit test configuration
└── README.md              # This file
```

## Test Types

### E2E Tests

End-to-end tests verify the entire application flow from HTTP request to response. They:
- Test complete API endpoints
- Use a real database connection (test database recommended)
- Use real Redis connection
- Test authentication and authorization flows
- Verify response structures and status codes

**Location**: `test/e2e/modules/{module-name}/{module-name}.e2e-spec.ts`

**Example**: `test/e2e/modules/auth/auth.e2e-spec.ts`

### Unit Tests

Unit tests verify individual components in isolation. They:
- Test services, controllers, guards, filters, etc. independently
- Use mocks for dependencies
- Are fast and focused
- Test business logic and edge cases

**Location**: `test/unit/modules/{module-name}/{component}.spec.ts`

**Example**: `test/unit/modules/auth/auth.service.spec.ts`

## Running Tests

### Prerequisites

Before running E2E tests, ensure:
1. MySQL database is running and test database exists
2. Redis is running
3. Environment variables are set (see [Environment Setup](#environment-setup))

### All Tests
```bash
npm test
```

### E2E Tests Only
```bash
# Basic run
npm run test:e2e

# Watch mode
npm run test:e2e:watch

# Run specific test file
npm run test:e2e -- test/e2e/modules/health/health.e2e-spec.ts

# With environment variables
DB_NAME=test_nest_monolit REDIS_HOST=localhost npm run test:e2e
```

### Unit Tests Only
```bash
npm run test:unit
npm run test:unit:watch  # Watch mode
npm run test:unit:cov    # With coverage
```

### Coverage
```bash
npm run test:cov
```

## Test Helpers

### E2E Helpers

Located in `test/e2e/helpers/`:

- **`app.helper.ts`**: Creates and configures a test NestJS application
- **`auth.helper.ts`**: Helper functions for authentication testing (register, login, get tokens, etc.)

**Usage**:
```typescript
import { createTestApp } from '../../helpers';
import { getAuthTokens } from '../../helpers/auth.helper';
```

## Writing Tests

### E2E Test Structure

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers';

describe('ModuleController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/endpoint (METHOD)', () => {
    it('should do something', () => {
      return request(app.getHttpServer())
        .get('/api/endpoint')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty('data');
          // ... assertions
        });
    });
  });
});
```

### Unit Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Service } from '../../../src/modules/module/service';

describe('Service', () => {
  let service: Service;
  let mockDependency: jest.Mocked<Dependency>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Service,
        {
          provide: Dependency,
          useValue: createMockDependency(),
        },
      ],
    }).compile();

    service = module.get<Service>(Service);
    mockDependency = module.get(Dependency);
  });

  describe('method', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = service.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Test Configuration

### E2E Configuration (`jest-e2e.json`)

- **Test Regex**: `e2e/.*\.e2e-spec\.ts$`
- **Timeout**: 60 seconds (for database operations)
- **Environment**: Node.js

### Unit Configuration (`jest-unit.json`)

- **Test Regex**: `unit/.*\.spec\.ts$`
- **Timeout**: 10 seconds
- **Coverage**: Configured to exclude DTOs, models, and module files

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data (use `beforeEach`/`afterEach` if needed)
3. **Naming**: Use descriptive test names that explain what is being tested
4. **Structure**: Follow the Arrange-Act-Assert pattern
5. **Mocks**: Use mocks for external dependencies in unit tests
6. **Data**: Use unique test data to avoid conflicts (e.g., `Date.now()` in emails)
7. **Response Structure**: Remember that successful responses are wrapped in `{ data: ... }` by the `TransformInterceptor`

## Environment Setup

For E2E tests, ensure:

### Required Services

1. **MySQL Database**: 
   - Database must exist and be accessible
   - Set environment variables: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
   - Example: `DB_NAME=test_nest_monolit`
   - Run migrations: `npm run migration:run`

2. **Redis**: 
   - Redis must be running and accessible
   - Set environment variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional)
   - Default: `localhost:6379`

3. **AWS S3** (for file tests):
   - AWS credentials configured or mocked
   - Set environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`

### Test Environment Variables

Create a `.env.test` file or set environment variables before running tests:

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_NAME=test_nest_monolit
DB_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL_SECONDS=3600

# JWT
JWT_ACCESS_SECRET=test_secret_key
JWT_ACCESS_EXPIRES_IN=3600s

# AWS (optional, for file tests)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=test-bucket
AWS_REGION=us-east-1

# App
APP_ENV=test
APP_HOST=localhost
APP_PORT=3000
```

### Running Tests with Environment Variables

```bash
# Option 1: Set environment variables inline
DB_NAME=test_nest_monolit REDIS_HOST=localhost npm run test:e2e

# Option 2: Use .env.test file (if using dotenv)
# Create .env.test file and load it in test setup
```

### Database Setup for Tests

1. Create test database:
   ```sql
   CREATE DATABASE test_nest_monolit;
   ```

2. Run migrations:
   ```bash
   DB_NAME=test_nest_monolit npm run migration:run
   ```

3. (Optional) Seed test data:
   ```bash
   DB_NAME=test_nest_monolit npm run seed:run
   ```

## Database Cleanup

E2E tests automatically clean up test data after test suites complete. The cleanup helper:

- **Identifies test data** by email patterns (default: `DEFAULT_TEST_EMAIL_PATTERN` constant, which is `@example.com`)
- **Deletes in correct order**: files → users (respects foreign keys)
- **Uses hard delete** (`force: true`) to remove test data completely
- **Uses transactions** to ensure atomic cleanup operations
- **Note**: Sessions are stored in Redis only, not in the database

### Cleanup Helper Usage

```typescript
import { createDatabaseCleanupHelper, DEFAULT_TEST_EMAIL_PATTERN } from '../../helpers';

describe('ModuleController (e2e)', () => {
  let app: INestApplication;
  let cleanupHelper: DatabaseCleanupHelper;

  beforeAll(async () => {
    app = await createTestApp();
    cleanupHelper = createDatabaseCleanupHelper(app);
    
    // Optional: Clean up before starting tests
    await cleanupHelper.cleanAllTestData();
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await cleanupHelper.cleanAllTestData();
    await app.close();
  });

  it('should create a test user', () => {
    const userData = {
      email: `testuser${Date.now()}${DEFAULT_TEST_EMAIL_PATTERN}`,
      password: 'password123',
    };
    // ... test code
  });
});
```

### Cleanup Methods

- **`cleanAllTestData()`**: Cleans all test data matching `DEFAULT_TEST_EMAIL_PATTERN` pattern
- **`cleanTestData(options)`**: Cleans test data with custom email pattern
- **`cleanUserData(email)`**: Cleans data for a specific user
- **`truncateAllTables()`**: Truncates all tables (use with caution)

### Test Data Isolation

- Test data is identified by email patterns (use `DEFAULT_TEST_EMAIL_PATTERN` constant from `database.helper`)
- Cleanup runs in `afterAll` hooks to clean up after test suites
- For test isolation, use unique email addresses per test (e.g., `` `test${Date.now()}${DEFAULT_TEST_EMAIL_PATTERN}` ``)
- Import the constant: `import { DEFAULT_TEST_EMAIL_PATTERN } from '../../helpers/database.helper';`
- Consider using `beforeEach` cleanup for strict isolation (commented out by default)

## Future Improvements

- [ ] Add database seeding for E2E tests
- [ ] Add test fixtures/factories
- [ ] Add integration test layer
- [ ] Add performance/load tests
- [ ] Add contract tests
- [ ] Add database transaction rollback per test for better isolation

