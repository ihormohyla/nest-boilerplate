import { NotFoundException } from '@nestjs/common';
import { Attributes, CreationAttributes, FindOptions, ModelScopeOptions, Transaction } from 'sequelize';
import { Model, ModelCtor } from 'sequelize-typescript';

import { ErrorMessages } from '../constants/error-messages.constant';
import { PaginatedResponseDto, PaginationMetaDto } from '../dto/paginated-response.dto';
import { PaginationDto } from '../dto/pagination.dto';

export abstract class BaseService<TModel extends Model> {
  protected constructor(protected readonly model: ModelCtor<TModel>) {}

  async create(payload: CreationAttributes<TModel>, transaction?: Transaction): Promise<TModel> {
    return this.model.create(payload, transaction ? { transaction } : undefined);
  }

  async findAll(
    options?: FindOptions<Attributes<TModel>>,
    scope?: keyof ModelScopeOptions<TModel> | (keyof ModelScopeOptions<TModel>)[],
    transaction?: Transaction,
  ): Promise<TModel[]> {
    const queryOptions: FindOptions<Attributes<TModel>> = {
      ...(options ?? {}),
      transaction,
    };

    if (scope) {
      return this.model.scope(scope as any).findAll(queryOptions);
    }
    return this.model.findAll(queryOptions);
  }

  async findAllPaginated(
    pagination: PaginationDto,
    options?: FindOptions<Attributes<TModel>>,
    scope?: keyof ModelScopeOptions<TModel> | (keyof ModelScopeOptions<TModel>)[],
    transaction?: Transaction,
  ): Promise<PaginatedResponseDto<TModel>> {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    const queryOptions: FindOptions<Attributes<TModel>> = {
      ...(options ?? {}),
      limit,
      offset,
      order: options?.order ?? [['createdAt', 'DESC']],
      transaction,
    };

    let modelQuery;
    if (scope) {
      modelQuery = this.model.scope(scope as any);
    } else {
      modelQuery = this.model;
    }

    // Execute queries in parallel for better performance
    const [data, total] = await Promise.all([
      modelQuery.findAll(queryOptions),
      modelQuery.count({ where: queryOptions.where, transaction }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      data,
      meta,
    };
  }

  async findOne(
    id: number,
    options?: FindOptions<Attributes<TModel>>,
    transaction?: Transaction,
  ): Promise<TModel> {
    const queryOptions: FindOptions<Attributes<TModel>> = {
      ...(options ?? {}),
      transaction,
    };

    const entity = await this.model.findByPk(id, queryOptions);
    if (!entity) {
      throw new NotFoundException({
        message: ErrorMessages.ERRORS.NOT_FOUND_WITH_ID,
        args: { resource: this.model.name, id: id.toString() },
      });
    }
    return entity;
  }

  async remove(id: number, transaction?: Transaction): Promise<void> {
    const entity = await this.findOne(id, undefined, transaction);
    await entity.destroy(transaction ? { transaction } : undefined);
  }
}
