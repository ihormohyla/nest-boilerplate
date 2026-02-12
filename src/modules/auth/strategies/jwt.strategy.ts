import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';

import { ErrorMessages } from '../../../common/constants/error-messages.constant';
import { UserResponseDto } from '../../users/dto';
import { IUserRepository, USER_REPOSITORY_TOKEN } from '../../users/repositories';
import { TokenService } from '../services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly extractJwtFromHeader = ExtractJwt.fromAuthHeaderAsBearerToken();

  constructor(
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret', 'change_me'),
      passReqToCallback: true, // Pass request to validate method to access token for blacklist check
    } as StrategyOptions);
  }

  async validate(req: Request, payload: { sub: number; role: number }): Promise<UserResponseDto> {
    // Extract token from request to check blacklist
    // When passReqToCallback is true, we need to extract token manually
    const token = this.extractJwtFromHeader(req);

    if (!token) {
      throw new UnauthorizedException(ErrorMessages.AUTH.TOKEN_MISSING);
    }

    (req as Request & { accessToken?: string }).accessToken = token;

    // Check if token is blacklisted before validating user
    const isBlacklisted = await this.tokenService.isAccessTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException(ErrorMessages.AUTH.TOKEN_REVOKED);
    }

    // Verify user exists (throws NotFoundException if not found)
    const user = await this.userRepository.findOne(payload.sub);

    return this.userRepository.toSafeEntity(user);
  }
}
