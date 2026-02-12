import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppI18nModule } from './common/i18n/i18n.module';
import { RedisModule } from './common/redis/redis.module';
import awsConfig from './config/aws.config';
import configuration from './config/configuration';
import databaseConfig from './config/database.config';
import { SequelizeConfigService } from './config/database.provider';
import i18nConfig from './config/i18n.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, databaseConfig, jwtConfig, redisConfig, i18nConfig, awsConfig],
    }),
    SequelizeModule.forRootAsync({
      useClass: SequelizeConfigService,
    }),
    RedisModule,
    AppI18nModule.forRoot(),
    HealthModule,
    UsersModule,
    AuthModule,
    FilesModule,
  ],
})
export class AppModule {}
