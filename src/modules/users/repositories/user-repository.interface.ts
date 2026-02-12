import { UserResponseDto } from '../dto';
import { User } from '../models';

/**
 * User repository interface for dependency injection.
 * This interface allows modules to depend on the contract rather than
 * the concrete implementation, reducing coupling and preventing circular dependencies.
 */
export interface IUserRepository {
  /**
   * Find a user by ID.
   * @param id - User ID
   * @returns User entity or null if not found
   * @throws {NotFoundException} If user not found (when using UsersService.findOne)
   */
  findOne(id: number): Promise<User>;

  /**
   * Convert user entity to safe DTO (without sensitive data).
   * @param user - User entity
   * @returns User response DTO
   */
  toSafeEntity(user: User): UserResponseDto;
}

// Token for dependency injection
export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');

