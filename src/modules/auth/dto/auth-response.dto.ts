import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  expiresIn!: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;
}
