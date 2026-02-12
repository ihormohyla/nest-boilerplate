import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';

import { BaseModel } from '../../../common/models/base.model';
import { User } from '../../users/models/user.model';

export enum FileStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export interface FileCreationAttributes {
  userId: number;
  key: string;
  bucket: string;
  fileName: string;
  mimeType: string;
  size?: number | null;
  url?: string | null;
  status?: FileStatus;
  isUsed?: boolean;
}

export interface FileAttributes extends FileCreationAttributes {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  status: FileStatus;
  isUsed: boolean;
}

@Table({
  tableName: 'files',
  paranoid: true,
})
export class FileEntity extends BaseModel<FileAttributes, FileCreationAttributes> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  userId!: number;

  @Column({
    type: DataType.STRING(512),
    allowNull: false,
    unique: true,
  })
  key!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  bucket!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  fileName!: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: false,
  })
  mimeType!: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  size?: number | null;

  @Column({
    type: DataType.STRING(1024),
    allowNull: true,
  })
  url?: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(FileStatus)),
    allowNull: false,
    defaultValue: FileStatus.PENDING,
  })
  status!: FileStatus;

  @Column({
    field: 'is_used',
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isUsed!: boolean;
}
