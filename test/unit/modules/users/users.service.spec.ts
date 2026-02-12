import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Transaction } from 'sequelize';

import { AppRole } from '../../../../src/common/decorators/roles.decorator';
import { CreateUserDto, UpdateUserDto } from '../../../../src/modules/users/dto';
import { User } from '../../../../src/modules/users/models';
import { UsersService } from '../../../../src/modules/users/users.service';
import {
  DEFAULT_PASSWORD,
  TEST_PASSWORDS,
  TEST_USER_NAMES,
  buildTestEmail,
} from '../../../constants/test-users.constant';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userModel: jest.Mocked<typeof User>;

  beforeEach(() => {
    userModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
      scope: jest.fn().mockReturnValue({
        findAll: jest.fn(),
      }),
    } as unknown as jest.Mocked<typeof User>;

    service = new UsersService(userModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws when email is already used', async () => {
      const dto = {
        email: buildTestEmail('duplicate'),
        password: DEFAULT_PASSWORD,
      } as CreateUserDto;
      userModel.findOne.mockResolvedValueOnce({ id: 1 } as any);

      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('hashes password, applies defaults, and forwards transaction', async () => {
      const dto = {
        email: buildTestEmail('new-user'),
        password: DEFAULT_PASSWORD,
      } as CreateUserDto;
      const hashedPassword = 'hashed-password';
      const createdUser = { id: 42 } as User;
      const transaction = {} as Transaction;

      userModel.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);
      userModel.create.mockResolvedValueOnce(createdUser as any);

      const result = await service.create(dto, transaction);

      expect(bcrypt.hash).toHaveBeenCalledWith(DEFAULT_PASSWORD, 12);
      expect(userModel.create).toHaveBeenCalledWith(
        {
          email: dto.email,
          password: hashedPassword,
          role: User.roleDefaultValue,
          firstName: null,
          lastName: null,
        },
        { transaction },
      );
      expect(result).toBe(createdUser);
    });

    it('keeps role and names when provided', async () => {
      const dto = {
        email: buildTestEmail('named-user'),
        password: DEFAULT_PASSWORD,
        role: AppRole.MANAGER,
        firstName: TEST_USER_NAMES.MANAGER.firstName,
        lastName: TEST_USER_NAMES.MANAGER.lastName,
      } as CreateUserDto;
      const hashedPassword = 'hashed-with-names';

      userModel.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);
      userModel.create.mockResolvedValueOnce({ id: 55 } as any);

      await service.create(dto);

      expect(userModel.create).toHaveBeenCalledWith(
        {
          email: dto.email,
          password: hashedPassword,
          role: AppRole.MANAGER,
          firstName: TEST_USER_NAMES.MANAGER.firstName,
          lastName: TEST_USER_NAMES.MANAGER.lastName,
        },
        undefined,
      );
    });
  });

  describe('findByEmail', () => {
    it('queries the model with where clause and transaction', async () => {
      const email = buildTestEmail('lookup');
      const transaction = {} as Transaction;
      const found = { id: 3 } as User;
      userModel.findOne.mockResolvedValueOnce(found as any);

      const result = await service.findByEmail(email, transaction);

      expect(userModel.findOne).toHaveBeenCalledWith({ where: { email }, transaction });
      expect(result).toBe(found);
    });
  });

  describe('update', () => {
    it('hashes password when provided and forwards transaction', async () => {
      const existingUser = {
        update: jest.fn(),
      } as unknown as User;
      const updated = { id: 1, firstName: TEST_USER_NAMES.UPDATED.firstName } as User;
      const transaction = {} as Transaction;
      const payload: UpdateUserDto = {
        password: TEST_PASSWORDS.UPDATED,
        firstName: TEST_USER_NAMES.UPDATED.firstName,
      };

      userModel.findByPk.mockResolvedValueOnce(existingUser as any);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('updated-hash');
      (existingUser.update as jest.Mock).mockResolvedValueOnce(updated);

      const result = await service.update(1, payload, transaction);

      expect(userModel.findByPk).toHaveBeenCalledWith(1, { transaction });
      expect(bcrypt.hash).toHaveBeenCalledWith(TEST_PASSWORDS.UPDATED, 12);
      expect(existingUser.update).toHaveBeenCalledWith(
        {
          password: 'updated-hash',
          firstName: TEST_USER_NAMES.UPDATED.firstName,
        },
        { transaction },
      );
      expect(result).toBe(updated);
    });

    it('skips hashing when password absent', async () => {
      const existingUser = {
        update: jest.fn(),
      } as unknown as User;
      const payload: UpdateUserDto = {
        firstName: TEST_USER_NAMES.TO_UPDATE.firstName,
      };

      userModel.findByPk.mockResolvedValueOnce(existingUser as any);
      (existingUser.update as jest.Mock).mockResolvedValueOnce(existingUser);

      await service.update(2, payload);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(existingUser.update).toHaveBeenCalledWith(
        {
          firstName: TEST_USER_NAMES.TO_UPDATE.firstName,
        },
        undefined,
      );
    });
  });

  describe('toSafeEntity', () => {
    it('maps fields, ensuring nullable names', () => {
      const now = new Date();
      const user = {
        id: 10,
        email: 'safe@example.com',
        role: AppRole.ADMIN,
        firstName: undefined,
        lastName: 'Doe',
        createdAt: now,
        updatedAt: now,
      } as unknown as User;

      const safe = service.toSafeEntity(user);

      expect(safe).toEqual({
        id: 10,
        email: 'safe@example.com',
        role: AppRole.ADMIN,
        firstName: null,
        lastName: 'Doe',
        createdAt: now,
        updatedAt: now,
      });
    });
  });
});
