import { INestApplication, Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Transaction, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { FileEntity } from 'src/modules/files/models';
import { User } from 'src/modules/users/models';

const isDebug = process.env.NODE_ENV === 'dev' || process.env.DEBUG;

/**
 * Default email pattern for test users
 * Used to identify and clean up test data in the database
 */
export const DEFAULT_TEST_EMAIL_PATTERN = '@example.com';

export interface CleanupOptions {
  /**
   * Email pattern to match test users (e.g., DEFAULT_TEST_EMAIL_PATTERN)
   * If not provided, uses DEFAULT_TEST_EMAIL_PATTERN
   */
  emailPattern?: string;
  /**
   * Transaction to use for cleanup
   */
  transaction?: Transaction;
  /**
   * Whether to use force delete (hard delete) instead of soft delete
   */
  force?: boolean;
}

/**
 * Database cleanup helper for E2E tests
 */
export class DatabaseCleanupHelper {
  private readonly sequelize: Sequelize;
  private readonly userModel: typeof User;
  private readonly fileModel: typeof FileEntity;
  private readonly logger = new Logger(DatabaseCleanupHelper.name);

  constructor(app: INestApplication) {
    this.sequelize = app.get<Sequelize>(Sequelize);

    // Get models from DI container (preferred method)
    try {
      this.userModel = app.get<typeof User>(getModelToken(User));
      this.fileModel = app.get<typeof FileEntity>(getModelToken(FileEntity));
    } catch (error) {
      if (isDebug) {
        this.logger.warn(
          'Failed to resolve models via Nest container, falling back to Sequelize registry',
          error as Error,
        );
      }
      // Fallback: Get models from Sequelize instance models registry
      const models = this.sequelize.models;
      // Models are registered with their class names
      this.userModel = models.User as typeof User;
      this.fileModel = models.FileEntity as typeof FileEntity;

      if (!this.userModel || !this.fileModel) {
        throw new Error(
          'Failed to get models from DI container or Sequelize instance. ' +
            'Make sure models are properly registered in modules.',
        );
      }
    }
  }

  /**
   * Clean up test data from database
   * Deletes in order: files -> users (respects foreign keys)
   * Note: Sessions are stored in Redis only, not in the database
   */
  async cleanTestData(options: CleanupOptions = {}): Promise<void> {
    const { emailPattern = DEFAULT_TEST_EMAIL_PATTERN, transaction } = options;

    try {
      const cleanupTransaction = transaction || (await this.sequelize.transaction());

      try {
        // Get test users by email pattern (use unscoped to include soft-deleted users)
        const whereClause = emailPattern
          ? {
              email: {
                [Op.like]: `%${emailPattern}`,
              },
            }
          : {};

        const testUsers = await this.userModel.unscoped().findAll({
          where: whereClause,
          transaction: cleanupTransaction,
        });

        if (testUsers.length === 0) {
          if (!transaction) {
            await cleanupTransaction.commit();
          }
          return;
        }

        const userIds = testUsers.map((user) => user.id);
        const userEmails = testUsers.map((user) => user.email);

        // Log cleanup for debugging
        if (process.env.NODE_ENV === 'test' || process.env.DEBUG) {
          this.logger.log(`Cleaning up ${testUsers.length} test users: ${userEmails.join(', ')}`);
        }

        // Delete files associated with test users (use unscoped to include soft-deleted)
        const deletedFiles = await this.fileModel.unscoped().destroy({
          where: {
            userId: {
              [Op.in]: userIds,
            },
          },
          force: true, // Hard delete - remove from database permanently
          transaction: cleanupTransaction,
        });

        // Hard delete test users individually to ensure proper cleanup
        // This ensures hard delete even if users are soft-deleted
        let deletedUsers = 0;
        for (const user of testUsers) {
          try {
            await user.destroy({
              force: true, // Hard delete - remove from database permanently
              transaction: cleanupTransaction,
            });
            deletedUsers++;
          } catch (error) {
            // Log error but continue with other users
            this.logger.error(
              `Failed to delete user ${user.email} (ID: ${user.id})`,
              error as Error,
            );
          }
        }

        if (!transaction) {
          await cleanupTransaction.commit();
        }

        // Log cleanup result for debugging
        if (isDebug) {
          this.logger.log(
            `Cleanup completed: ${deletedUsers} users and ${deletedFiles} files deleted`,
          );
        }
      } catch (error) {
        if (!transaction) {
          await cleanupTransaction.rollback();
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to clean test data', error as Error);
      throw error;
    }
  }

  /**
   * Clean up data for a specific user by email
   * Returns true if user was found and deleted, false if user was not found
   */
  async cleanUserData(
    email: string,
    options: Omit<CleanupOptions, 'emailPattern'> = {},
  ): Promise<boolean> {
    const { transaction } = options;

    try {
      const cleanupTransaction = transaction || (await this.sequelize.transaction());

      try {
        // Use unscoped to include soft-deleted users
        const user = await this.userModel.unscoped().findOne({
          where: { email },
          transaction: cleanupTransaction,
        });

        if (!user) {
          // Log when user is not found (for debugging)
          if (isDebug) {
            this.logger.log(`User ${email} not found in database (may have been already deleted)`);
          }
          if (!transaction) {
            await cleanupTransaction.commit();
          }
          return false;
        }

        // Log cleanup attempt (for debugging)
        if (isDebug) {
          this.logger.log(`Cleaning up user: ${email} (ID: ${user.id})`);
        }

        // Delete files associated with user (use unscoped to include soft-deleted)
        const deletedFiles = await this.fileModel.unscoped().destroy({
          where: { userId: user.id },
          force: true, // Hard delete - remove from database permanently
          transaction: cleanupTransaction,
        });

        // Hard delete user using the instance directly with force: true
        // This ensures hard delete even if the user is soft-deleted
        await user.destroy({
          force: true, // Hard delete - remove from database permanently
          transaction: cleanupTransaction,
        });

        if (!transaction) {
          await cleanupTransaction.commit();
        }

        // Log cleanup success (for debugging)
        if (isDebug) {
          this.logger.log(
            `Successfully deleted user: ${email} (ID: ${user.id}) and ${deletedFiles} files`,
          );
        }

        return true;
      } catch (error) {
        if (!transaction) {
          await cleanupTransaction.rollback();
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to clean user data for ${email}`, error as Error);
      throw error;
    }
  }

  /**
   * Clean up all test data (more aggressive cleanup)
   * This will delete all users with emails ending in DEFAULT_TEST_EMAIL_PATTERN
   * Includes both soft-deleted and non-deleted users
   */
  async cleanAllTestData(options: Omit<CleanupOptions, 'emailPattern'> = {}): Promise<void> {
    try {
      await this.cleanTestData({
        ...options,
        emailPattern: DEFAULT_TEST_EMAIL_PATTERN,
        force: true,
      });
    } catch (error) {
      this.logger.error('Failed to clean all test data', error as Error);
      // Don't re-throw - allow caller to handle gracefully
      // This prevents test failures if cleanup fails, but logs the error for debugging
    }
  }

  /**
   * Truncate all tables (use with caution - removes ALL data)
   * Only use this if you want to clean the entire test database
   */
  async truncateAllTables(): Promise<void> {
    const transaction = await this.sequelize.transaction();

    try {
      // Disable foreign key checks
      await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

      // Delete all records (use unscoped to include soft-deleted)
      // Note: Sessions are stored in Redis only, not in the database
      await this.fileModel.unscoped().destroy({ where: {}, force: true, transaction });
      await this.userModel.unscoped().destroy({ where: {}, force: true, transaction });

      // Re-enable foreign key checks
      await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      this.logger.error('Failed to truncate tables', error as Error);
      throw error;
    }
  }

  /**
   * Clean up test data created by specific test email patterns
   */
  async cleanTestDataByPattern(
    pattern: string,
    options: Omit<CleanupOptions, 'emailPattern'> = {},
  ): Promise<void> {
    return this.cleanTestData({ ...options, emailPattern: pattern });
  }
}

/**
 * Create a database cleanup helper instance
 */
export function createDatabaseCleanupHelper(app: INestApplication): DatabaseCleanupHelper {
  return new DatabaseCleanupHelper(app);
}
