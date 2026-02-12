import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AuthResponseDto, LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { TokenService } from './services/token.service';
import { ErrorMessages } from '../../common/constants/error-messages.constant';
import { AppRole } from '../../common/decorators/roles.decorator';
import { SuccessResponseDto } from '../../common/dto';
import { parseExpiresToSeconds } from '../../common/utils/time.util';
import { UserResponseDto } from '../users/dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    payload: RegisterDto,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(payload.email);
    if (existing) {
      throw new BadRequestException(ErrorMessages.AUTH.EMAIL_TAKEN);
    }

    const user = await this.usersService.create({
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role ?? AppRole.USER,
    });

    return this.issueTokens(user.id, user.role, options);
  }

  async login(
    payload: LoginDto,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_CREDENTIALS);
    }

    const valid = await bcrypt.compare(payload.password, user.password);
    if (!valid) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_CREDENTIALS);
    }

    return this.issueTokens(user.id, user.role, options);
  }

  async refreshToken(
    payload: RefreshTokenDto,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponseDto> {
    // Verify refresh token
    const tokenData = await this.tokenService.verifyRefreshToken(payload.refreshToken);
    if (!tokenData) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    // Get user
    const user = await this.usersService.findOne(tokenData.userId);
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH.USER_NOT_FOUND);
    }

    // Revoke old refresh token (refresh token rotation)
    await this.tokenService.revokeRefreshToken(payload.refreshToken);

    // Issue new tokens
    return this.issueTokens(user.id, user.role, options);
  }

  async logout(userId: number, accessToken: string): Promise<SuccessResponseDto> {
    // Blacklist access token and revoke all refresh tokens
    await this.tokenService.logout(userId, accessToken);

    return { success: true };
  }

  async me(userId: number): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(userId);
    return this.usersService.toSafeEntity(user);
  }

  /**
   * Issue new access and refresh tokens
   */
  private async issueTokens(
    userId: number,
    role: AppRole,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponseDto> {
    // Generate access token
    const accessToken = await this.tokenService.generateAccessToken(userId, role);

    // Generate and store refresh token in Redis
    const refreshToken = await this.tokenService.generateRefreshToken(userId, role, options);

    // Get access token expiration in seconds
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '3600s');
    const expiresIn = parseExpiresToSeconds(accessExpiresIn);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn,
      },
    };
  }
}
