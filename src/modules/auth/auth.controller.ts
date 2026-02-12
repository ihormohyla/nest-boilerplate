import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { AuthResponseDto, LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { ApiVersions } from '../../common/constants/api-versions.constant';
import { ErrorMessages } from '../../common/constants/error-messages.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponseDto } from '../../common/dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserResponseDto } from '../users/dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Version(ApiVersions.V1)
  @Post('register')
  @ApiOkResponse({ type: AuthResponseDto })
  async register(@Body() payload: RegisterDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authService.register(payload, { ipAddress, userAgent });
  }

  @Version(ApiVersions.V1)
  @Post('login')
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() payload: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authService.login(payload, { ipAddress, userAgent });
  }

  @Version(ApiVersions.V1)
  @Post('refresh')
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Body() payload: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authService.refreshToken(payload, { ipAddress, userAgent });
  }

  @Version(ApiVersions.V1)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: SuccessResponseDto })
  async logout(
    @CurrentUser() user: { id: number },
    @Req() req: Request,
  ): Promise<SuccessResponseDto> {
    const requestWithToken = req as Request & { accessToken?: string };
    const accessToken =
      requestWithToken.accessToken ?? this.extractBearerToken(req.headers.authorization ?? '');

    if (!accessToken) {
      throw new BadRequestException(ErrorMessages.AUTH.BEARER_TOKEN_REQUIRED);
    }

    return this.authService.logout(user.id, accessToken);
  }

  private extractBearerToken(headerValue: string): string | null {
    if (!headerValue) {
      return null;
    }

    const parts = headerValue.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
      return null;
    }

    return parts[1];
  }

  @Version(ApiVersions.V1)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentUser() user: { id: number }): Promise<UserResponseDto> {
    return this.authService.me(user.id);
  }
}
