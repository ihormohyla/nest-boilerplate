import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { Attributes, FindOptions, ModelScopeOptions, Transaction } from 'sequelize';

import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { User, UserCreationAttributes } from './models';
import { IUserRepository } from './repositories';
import { ErrorMessages } from '../../common/constants/error-messages.constant';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BaseService } from '../../common/services';

@Injectable()
export class UsersService extends BaseService<User> implements IUserRepository {
  private readonly saltRounds = 12;

  constructor(@InjectModel(User) userModel: typeof User) {
    super(userModel);
  }

  async create(payload: CreateUserDto, transaction?: Transaction): Promise<User> {
    const existing = await this.findByEmail(payload.email, transaction);
    if (existing) {
      throw new BadRequestException(ErrorMessages.AUTH.EMAIL_TAKEN);
    }

    const hashedPassword = await this.hashPassword(payload.password);

    const creationPayload: UserCreationAttributes = {
      email: payload.email,
      password: hashedPassword,
      role: payload.role ?? User.roleDefaultValue,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
    };

    return super.create(creationPayload, transaction);
  }

  async findAll(
    options?: FindOptions<Attributes<User>>,
    scope?: keyof ModelScopeOptions<User> | (keyof ModelScopeOptions<User>)[],
    transaction?: Transaction,
  ): Promise<User[]> {
    return super.findAll(options, scope, transaction);
  }

  async findAllPaginated(
    pagination: PaginationDto,
    options?: FindOptions<Attributes<User>>,
    scope?: keyof ModelScopeOptions<User> | (keyof ModelScopeOptions<User>)[],
    transaction?: Transaction,
  ): Promise<PaginatedResponseDto<User>> {
    return super.findAllPaginated(pagination, options, scope, transaction);
  }

  async findByEmail(email: string, transaction?: Transaction): Promise<User | null> {
    return this.model.findOne({ where: { email }, transaction });
  }

  async findOne(
    id: number,
    options?: FindOptions<Attributes<User>>,
    transaction?: Transaction,
  ): Promise<User> {
    return super.findOne(id, options, transaction);
  }

  async update(id: number, payload: UpdateUserDto, transaction?: Transaction): Promise<User> {
    const user = await super.findOne(id, undefined, transaction);
    const updatePayload: UpdateUserDto = { ...payload };

    if (payload.password !== undefined) {
      updatePayload.password = await this.hashPassword(payload.password);
    }

    return user.update(updatePayload, transaction ? { transaction } : undefined);
  }

  async remove(id: number, transaction?: Transaction): Promise<void> {
    await super.remove(id, transaction);
  }

  /**
   * Convert user entity to response DTO (without sensitive data).
   * Alias for toResponseDto for backward compatibility with IUserRepository interface.
   */
  toSafeEntity(user: User): UserResponseDto {
    return this.toResponseDto(user);
  }

  /**
   * Convert user entity to response DTO (without sensitive data like password).
   * Follows Nest.js naming convention for entity-to-DTO mapping.
   */
  toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }
}
