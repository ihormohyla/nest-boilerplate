import { Column, DataType, Model } from 'sequelize-typescript';

export class BaseModel<
  TAttributes extends Record<string, any> = any,
  TCreationAttributes extends Record<string, any> = TAttributes,
> extends Model<TAttributes, TCreationAttributes> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updatedAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  deletedAt?: Date;
}
