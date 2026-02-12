# Nest Monolith Starter

A production-ready NestJS starter template tailored for outsourcing projects. It provides opinionated defaults for authentication, internationalisation, documentation, storage, testing, and operational tooling out of the box.

---

## ✨ Features

- **NestJS 11 / Node.js 23** with strict TypeScript configuration
- **Sequelize** (MySQL) ORM with typed models, migrations, and paranoid soft deletes
- **JWT authentication** with Redis-backed refresh tokens and role-based access control (ADMIN / MANAGER / USER)
- **AWS S3 integration** with pre-signed upload workflow and metadata tracking
- **Swagger/OpenAPI** documentation under `/api/docs`
- **i18n** via `nestjs-i18n` with JSON translations and locale detection
- **Luxon** utilities for time/date handling
- **Bcrypt** password hashing
- **Jest + Supertest** unit and e2e testing setup
- **Dockerfile** for containerised deployment

---

## 📁 Project Structure

```
├── src
│   ├── app.module.ts
│   ├── main.ts
│   ├── common
│   │   ├── constants/
│   │   ├── decorators/
│   │   ├── dto/             # shared DTOs
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── i18n/            # i18n module wrapper
│   │   ├── interceptors/
│   │   ├── middlewares/
│   │   ├── models/          # base model
│   │   ├── redis/           # Redis connection module
│   │   ├── services/        # shared base service
│   │   └── utils/
│   ├── config/              # configuration factories & providers
│   │   ├── *.config.ts      # registerAs configs
│   │   └── *.provider.ts    # service providers (DB, etc.)
│   ├── locales/             # translation files (JSON)
│   ├── migrations/          # Sequelize CLI migrations
│   └── modules/
│       ├── auth/
│       ├── files/
│       ├── health/
│       ├── sessions/
│       └── users/
├── test/                    # Jest setup & e2e specs
├── Dockerfile
└── ...
```

---

## ⚙️ Configuration

Create an `.env` file (or configure environment variables) with the following key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_HOST`, `APP_PORT` | Application host & port | `0.0.0.0`, `3000` |
| `APP_PREFIX` | Global API prefix (e.g. `api`) | `api` |
| `APP_ENV` | Environment (`development`, `production`) | `development` |
| `APP_VERSION_PREFIX` | API version prefix (e.g. `v`) | `v` |
| `APP_CORS_ORIGINS` | JSON array of allowed CORS origins | `["http://localhost:3000"]` |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | MySQL connection settings | — |
| `DB_LOGGING` | Enable Sequelize query logging | `false` |
| `JWT_ACCESS_SECRET` | JWT access token secret key | — |
| `JWT_ACCESS_EXPIRES_IN` | JWT access token expiration (e.g., `3600s`, `1h`) | `3600s` |
| `JWT_REFRESH_EXPIRES_IN` | JWT refresh token expiration (e.g., `7d`, `14d`) | `7d` |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis instance configuration | `localhost`, `6379` |
| `REDIS_TTL_SECONDS` | Default TTL for Redis keys (seconds) | `3600` |
| `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS credentials & S3 bucket | — |
| `AWS_PRESIGNED_EXPIRES_IN` | Presigned URL expiration (seconds) | `900` |
| `I18N_FALLBACK_LANG` | Fallback locale (e.g. `en`) | `en` |
| `SWAGGER_TITLE`, `SWAGGER_DESCRIPTION`, `SWAGGER_VERSION` | Swagger metadata | — |

> **Note:** 
> - Configuration is organized using `registerAs` pattern in `src/config/` for type-safe access.
> - Infrastructure providers (Database, Redis, Session) are managed as NestJS services with proper lifecycle management.

---

## 🏗️ Architecture & Design Patterns

The project follows NestJS best practices with a modular, provider-based architecture:

- **Configuration Management**: All configurations use `registerAs` pattern for type-safe, namespaced access (e.g., `configService.get('database.host')`).
- **Provider Pattern**: Infrastructure services (Database, Redis) are implemented as injectable providers with proper lifecycle management:
  - `SequelizeConfigService` - Database connection provider
  - `RedisService` - Redis client with connection lifecycle management
- **Global Modules**: Infrastructure modules (`RedisModule`) are marked as `@Global()` for app-wide availability.
- **Base Services**: Generic `BaseService` provides common CRUD operations with transaction and scope support.
- **Error Handling**: Centralized exception filter with environment-aware logging (detailed in development, minimal in production).
- **Token Management**: JWT access tokens (stateless) with Redis-backed refresh tokens managed via `TokenService`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 23+
- PNPM/NPM/Yarn (project uses npm scripts)
- MySQL 8+
- Redis 6+

### Installation

```bash
npm install
```

### Database Setup

1. Configure MySQL credentials in `.env`.
2. Run migrations:

```bash
npm run migration:run
```

To revert:

```bash
npm run migration:revert
```

---

## 🧪 Testing

- **Unit & integration tests**
  ```bash
  npm test
  ```
- **Unit tests only**
  ```bash
  npm run test:unit
  ```
- **Watch mode**
  ```bash
  npm run test:watch
  npm run test:unit:watch
  npm run test:e2e:watch
  ```
- **Coverage**
  ```bash
  npm run test:cov
  npm run test:unit:cov
  ```
- **End-to-end tests**
  ```bash
  npm run test:e2e
  ```

> **Note:** E2E tests use `DEFAULT_TEST_EMAIL_PATTERN` constant (`@example.com`) to identify test data. See `test/README.md` for detailed testing documentation.

---

## 🧰 Development Workflow

### Start in watch mode

```bash
npm run start:dev
```

### Build production bundle

```bash
npm run build
```

### Run in production

```bash
npm run start:prod
```

---

## 🔐 Authentication Flow

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/auth/register` | POST | — | Register a new user |
| `/api/v1/auth/login` | POST | — | Authenticate with email & password |
| `/api/v1/auth/refresh` | POST | — | Refresh access token using refresh token |
| `/api/v1/auth/me` | GET | Bearer | Fetch current user |
| `/api/v1/auth/logout` | POST | Bearer | Blacklist access token and revoke all refresh tokens |

- Passwords stored hashed via bcrypt.
- JWT access tokens (stateless) issued with role embedded in the payload.
- Refresh tokens stored in Redis (via `TokenService`) and revocable per user.
- Access tokens are blacklisted in Redis on logout to prevent reuse.
- Token refresh implements rotation (new refresh token issued on each refresh).

---

## 🌍 Internationalisation (i18n)

- Implemented with `nestjs-i18n`.
- JSON translation files under `src/locales/{lang}/common.json`.
- Locale detected from `Accept-Language` header, falling back to `I18N_FALLBACK_LANG`.

---

## 📦 File Storage

- S3 pre-signed upload flow:
  - `POST /api/files/presign` — request pre-signed URL for a new file.
  - Client uploads directly to S3 using returned URL.
  - `PATCH /api/files/:id/confirm` — mark upload as completed, optionally storing size/URL/isUsed.
  - `DELETE /api/files/:key` — remove S3 object and metadata.
- Metadata persisted in `files` table with status tracking.

---

## 📑 API Documentation

- Swagger UI served at `/api/docs`.
- Each API version registered as a separate server entry (`API v1`, `API v2`, etc.).
- Bearer authentication configuration persisted in the UI.

---

## 🐳 Docker

### Local development (docker-compose)

Use the sample file below as a starting point for spinning up MySQL and Redis locally alongside the Nest app (with live reload inside the container if desired).

```yaml
# docker-compose.dev.yml
version: '3.9'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    command: npm run start:dev
    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
    env_file: .env
    ports:
      - "3000:3000"
    depends_on:
      - mysql
      - redis
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: nest_monolith
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
volumes:
  mysql_data:
```

Bring services up:

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Development image

Build an optimised image:

```bash
docker build --target dev -t nest-monolith-dev .
```

Run the container (ensure `.env`):

```bash
docker run --env-file .env -p 3000:3000 -v $(pwd)/src:/usr/src/app/src nest-monolit-dev
```

### Staging image

Build an optimised image:

```bash
docker build --target stage -t nest-monolith-stage .
```

Run the container (ensure `.env`):

```bash
docker run --env-file .env -p 3000:3000 nest-monolit-stage
```

### Production image

Build an optimised image:

```bash
docker build --target production -t nest-monolit-prod .
```

Run the container (ensure `.env` is production-ready):

```bash
docker run --env-file .env -p 3000:3000 nest-monolit-prod
```
---

## 📚 Module Overview

| Module | Responsibility | Highlights |
|--------|----------------|------------|
| `auth` | Authentication / authorization | JWT access tokens, Redis-backed refresh tokens, `TokenService`, `JwtAuthGuard`, `Roles` decorator |
| `users` | CRUD + profile endpoints | Role-based access, DTO validation, safe entity projection |
| `sessions` | Session management utilities |
| `files` | File metadata and S3 orchestration | Pre-signed uploads, confirmation workflow, soft deletes |
| `health` | Liveness/diagnostics | Uptime, timestamp |
| `common` | Cross-cutting utilities | Decorators, guards, filters, base service, interceptors, utils |
| `common/redis` | Redis connection management | Global Redis client provider with lifecycle management |
| `config` | Configuration & providers | Centralized configs (`registerAs`) and service providers (DB, etc.) |

---

## 🛠 Helpful Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint check (strict rules) |
| `npm run format` | Format with Prettier |
| `npm run migration:generate -- <name>` | Generate Sequelize migration |
| `npm run migration:run` | Apply latest migrations |
| `npm run migration:revert` | Undo last migration |
| `npm run seed:run` | Execute all seeders (if present) |
| `npm run start:dev` | Run Nest in watch mode |
| `npm run start:prod` | Run compiled app (`dist`) |
| `npm test` | Run all tests (unit + e2e) |
| `npm run test:unit` | Run unit tests only |
| `npm run test:e2e` | Run end-to-end tests only |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Generate test coverage report |

---


