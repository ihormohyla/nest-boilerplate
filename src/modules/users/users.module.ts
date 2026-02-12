import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { User } from './models';
import { USER_REPOSITORY_TOKEN } from './repositories';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SequelizeModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY_TOKEN,
      useExisting: UsersService,
    },
  ],
  exports: [UsersService, USER_REPOSITORY_TOKEN, SequelizeModule],
})
export class UsersModule {}
