import { Column, DataType, Table } from 'sequelize-typescript';

import { AppRole } from '../../../common/decorators/roles.decorator';
import { BaseModel } from '../../../common/models/base.model';

export interface UserCreationAttributes {
  email: string;
  password: string;
  role?: AppRole;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UserAttributes extends UserCreationAttributes {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  firstName?: string | null;
  lastName?: string | null;
  role: AppRole;
}

@Table({
  tableName: 'users',
  paranoid: true,
})
export class User extends BaseModel<UserAttributes, UserCreationAttributes> {
  static readonly roleDefaultValue = AppRole.USER;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  email!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  password!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: AppRole.USER,
  })
  role!: AppRole;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  firstName?: string | null;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  lastName?: string | null;
}
