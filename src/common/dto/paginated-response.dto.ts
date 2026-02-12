import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination metadata included in paginated responses.
 */
export class PaginationMetaDto {
  @ApiProperty({
    example: 1,
    description: 'Current page number (1-based)',
  })
  page!: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
  })
  limit!: number;

  @ApiProperty({
    example: 100,
    description: 'Total number of items',
  })
  total!: number;

  @ApiProperty({
    example: 10,
    description: 'Total number of pages',
  })
  totalPages!: number;

  @ApiProperty({
    example: true,
    description: 'Whether there is a next page',
  })
  hasNextPage!: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether there is a previous page',
  })
  hasPreviousPage!: boolean;
}

/**
 * Generic paginated response DTO.
 * Contains data array and pagination metadata.
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data!: T[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Pagination metadata',
  })
  meta!: PaginationMetaDto;
}

