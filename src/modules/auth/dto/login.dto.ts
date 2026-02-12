import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @ApiProperty({
    example: 'SecureP@ssw0rd123',
    description: 'User password',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password!: string;
}
