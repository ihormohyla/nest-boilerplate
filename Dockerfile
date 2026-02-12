# syntax=docker/dockerfile:1

FROM node:23-slim AS base
WORKDIR /usr/src/app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Production dependencies stage
FROM base AS prod-deps
ENV NODE_ENV=production
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build stage
FROM base AS build
ENV NODE_ENV=dev
COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY src ./src
COPY test ./test
COPY .sequelizerc ./.sequelizerc
COPY sequelize-cli.config.js ./sequelize-cli.config.js
RUN npm run build

# Runtime stage - common base for all environments
FROM base AS runtime-base
# Copy common files
COPY package.json package-lock.json ./
COPY sequelize-cli.config.js ./sequelize-cli.config.js
COPY .sequelizerc ./.sequelizerc
COPY src/migrations ./src/migrations
COPY src/seeders ./src/seeders
COPY .env ./.env
# Copy built artifacts
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/src/locales ./dist/locales
EXPOSE 3000
CMD ["node", "dist/main.js"]

# Development target
FROM runtime-base AS dev
ENV NODE_ENV=dev

# Staging target
FROM runtime-base AS stage
ENV NODE_ENV=staging

# Production target
FROM runtime-base AS production
ENV NODE_ENV=production