import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';

import { AppRole } from '../../../common/decorators/roles.decorator';
import { RedisService } from '../../../common/redis/redis.provider';
import { parseExpiresToDays, parseExpiresToSeconds } from '../../../common/utils/time.util';

interface RefreshTokenData {
  userId: number;
  role: AppRole;
  expiresAt: number; // Unix timestamp
  createdAt: number; // Unix timestamp
  ipAddress?: string;
  userAgent?: string;
}

interface TokenPayload {
  sub: number;
  role: AppRole;
}

@Injectable()
export class TokenService {
  private readonly refreshTokenPrefix = 'refresh:';
  private readonly userRefreshTokensPrefix = 'user:refresh_tokens:';
  private readonly blacklistPrefix = 'blacklist:';
  private readonly refreshTokenExpirationDays: number;
  private readonly accessTokenExpirationSeconds: number;

  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Get refresh token expiration from config (default: 7 days)
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    this.refreshTokenExpirationDays = parseExpiresToDays(refreshExpiresIn);

    // Get access token expiration from config (default: 1 hour)
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '3600s');
    this.accessTokenExpirationSeconds = parseExpiresToSeconds(accessExpiresIn);
  }

  /**
   * Generate access token (JWT)
   */
  async generateAccessToken(userId: number, role: AppRole): Promise<string> {
    const payload: TokenPayload = { sub: userId, role };
    return this.jwtService.signAsync(payload);
  }

  /**
   * Generate and store refresh token in Redis
   */
  async generateRefreshToken(
    userId: number,
    role: AppRole,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<string> {
    const redisClient = this.redisService.getClient();
    const refreshToken = randomUUID();
    const expiresAt = DateTime.now().plus({ days: this.refreshTokenExpirationDays });
    const expiresAtUnix = expiresAt.toSeconds();
    const createdAtUnix = DateTime.now().toSeconds();

    const tokenData: RefreshTokenData = {
      userId,
      role,
      expiresAt: expiresAtUnix,
      createdAt: createdAtUnix,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    };

    // Store refresh token data in Redis
    const refreshTokenKey = `${this.refreshTokenPrefix}${refreshToken}`;
    const ttlSeconds = Math.floor(expiresAtUnix - createdAtUnix);

    await redisClient.setex(refreshTokenKey, ttlSeconds, JSON.stringify(tokenData));

    // Track refresh token in user's token set for efficient cleanup
    const userTokensKey = `${this.userRefreshTokensPrefix}${userId}`;
    await redisClient.sadd(userTokensKey, refreshToken);
    await redisClient.expire(userTokensKey, ttlSeconds);

    return refreshToken;
  }

  /**
   * Verify and get refresh token data from Redis
   */
  async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenData | null> {
    try {
      const redisClient = this.redisService.getClient();
      const refreshTokenKey = `${this.refreshTokenPrefix}${refreshToken}`;
      const tokenDataStr = await redisClient.get(refreshTokenKey);

      if (!tokenDataStr) {
        return null;
      }

      const tokenData: RefreshTokenData = JSON.parse(tokenDataStr);
      const now = DateTime.now().toSeconds();

      // Check if token is expired
      if (tokenData.expiresAt < now) {
        // Token expired, remove it
        await this.revokeRefreshToken(refreshToken);
        return null;
      }

      return tokenData;
    } catch (error) {
      this.logger.error('Failed to verify refresh token', error);
      return null;
    }
  }

  /**
   * Revoke a single refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const redisClient = this.redisService.getClient();
      const refreshTokenKey = `${this.refreshTokenPrefix}${refreshToken}`;

      // Get token data to find userId
      const tokenDataStr = await redisClient.get(refreshTokenKey);
      if (tokenDataStr) {
        const tokenData: RefreshTokenData = JSON.parse(tokenDataStr);
        const userTokensKey = `${this.userRefreshTokensPrefix}${tokenData.userId}`;

        // Remove from user's token set
        await redisClient.srem(userTokensKey, refreshToken);

        // Delete token data
        await redisClient.del(refreshTokenKey);
      }
    } catch (error) {
      this.logger.error('Failed to revoke refresh token', error);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeUserRefreshTokens(userId: number): Promise<void> {
    try {
      const redisClient = this.redisService.getClient();
      const userTokensKey = `${this.userRefreshTokensPrefix}${userId}`;

      // Get all refresh tokens for the user
      const refreshTokens = await redisClient.smembers(userTokensKey);

      if (refreshTokens.length === 0) {
        return;
      }

      // Delete all refresh token data
      const deletePromises: Promise<void>[] = [];
      for (const refreshToken of refreshTokens) {
        const refreshTokenKey = `${this.refreshTokenPrefix}${refreshToken}`;
        deletePromises.push(redisClient.del(refreshTokenKey).then(() => undefined));
      }

      // Delete user's token set
      deletePromises.push(redisClient.del(userTokensKey).then(() => undefined));

      await Promise.all(deletePromises);
    } catch (error) {
      this.logger.error('Failed to revoke user refresh tokens', error);
    }
  }

  /**
   * Blacklist an access token (until it expires)
   */
  async blacklistAccessToken(accessToken: string): Promise<void> {
    try {
      const redisClient = this.redisService.getClient();
      const blacklistKey = `${this.blacklistPrefix}${accessToken}`;

      // Decode token to get expiration (don't verify, just decode)
      try {
        const payload = this.jwtService.decode(accessToken) as { exp?: number; iat?: number };
        if (payload?.exp) {
          const now = Math.floor(Date.now() / 1000);
          const ttl = payload.exp - now;

          if (ttl > 0) {
            // Store blacklisted token until expiration
            await redisClient.setex(blacklistKey, ttl, '1');
          }
        } else {
          // If no expiration, use default TTL (access token expiration)
          await redisClient.setex(blacklistKey, this.accessTokenExpirationSeconds, '1');
        }
      } catch (error) {
        this.logger.warn(
          'Failed to decode access token while blacklisting. Using default TTL.',
          error,
        );
        // If decoding fails, use default TTL
        await redisClient.setex(blacklistKey, this.accessTokenExpirationSeconds, '1');
      }
    } catch (error) {
      this.logger.error('Failed to blacklist access token', error);
    }
  }

  /**
   * Check if an access token is blacklisted
   */
  async isAccessTokenBlacklisted(accessToken: string): Promise<boolean> {
    try {
      const redisClient = this.redisService.getClient();
      const blacklistKey = `${this.blacklistPrefix}${accessToken}`;
      const exists = await redisClient.exists(blacklistKey);
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check token blacklist', error);
      // On error, assume token is not blacklisted to avoid blocking valid requests
      return false;
    }
  }

  /**
   * Blacklist access token and revoke all refresh tokens for a user (logout)
   */
  async logout(userId: number, accessToken: string): Promise<void> {
    // Blacklist access token
    await this.blacklistAccessToken(accessToken);

    // Revoke all refresh tokens
    await this.revokeUserRefreshTokens(userId);
  }
}
