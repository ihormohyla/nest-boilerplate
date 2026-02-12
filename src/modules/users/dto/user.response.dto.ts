import { ApiProperty } from '@nestjs/swagger';

import { AppRole } from '../../../common/decorators/roles.decorator';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'john.doe@example.com' })
  email!: string;

  @ApiProperty({ enum: AppRole, example: AppRole.USER })
  role!: AppRole;

  @ApiProperty({ example: 'John', nullable: true })
  firstName?: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName?: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-02T00:00:00.000Z' })
  updatedAt!: Date;
}
