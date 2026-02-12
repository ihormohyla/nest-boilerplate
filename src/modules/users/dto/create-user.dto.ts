import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

import { IsStrongPassword } from '../../../common/decorators/password-validation.decorator';
import { AppRole } from '../../../common/decorators/roles.decorator';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @ApiProperty({
    example: 'SecureP@ssw0rd123',
    description:
      'User password. Must contain: uppercase letter, lowercase letter, number, special character (@$!%*?&), and be at least 8 characters long',
    minLength: 8,
    writeOnly: true,
  })
  @IsString()
  @IsStrongPassword()
  password!: string;

  @ApiProperty({
    enum: AppRole,
    example: AppRole.USER,
    description: 'User role',
    required: false,
  })
  @IsEnum(AppRole)
  @IsOptional()
  role?: AppRole;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
