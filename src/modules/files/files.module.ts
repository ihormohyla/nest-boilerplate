import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileEntity } from './models';

@Module({
  imports: [ConfigModule, SequelizeModule.forFeature([FileEntity])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
