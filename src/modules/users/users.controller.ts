import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateUserDto, UpdateUserDto, DeleteUserResponseDto, UserResponseDto } from './dto';
import { User } from './models';
import { UsersService } from './users.service';
import { ApiVersions } from '../../common/constants/api-versions.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AppRole, Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Version(ApiVersions.V1)
  @Roles(AppRole.ADMIN)
  @Post()
  @ApiOkResponse({ type: UserResponseDto })
  async create(@Body() payload: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(payload);
    return this.usersService.toSafeEntity(user);
  }

  @Version(ApiVersions.V1)
  @Roles(AppRole.ADMIN, AppRole.MANAGER)
  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)', example: 10 })
  @ApiOkResponse({ type: PaginatedResponseDto<UserResponseDto> })
  async findAll(@Query() pagination: PaginationDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const result = await this.usersService.findAllPaginated(pagination);
    return {
      data: result.data.map((user) => this.usersService.toResponseDto(user)),
      meta: result.meta,
    };
  }

  @Version(ApiVersions.V1)
  @Get('me')
  @ApiOkResponse({ type: UserResponseDto })
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    const entity = await this.usersService.findOne(user.id);
    return this.usersService.toSafeEntity(entity);
  }

  @Version(ApiVersions.V1)
  @Roles(AppRole.ADMIN, AppRole.MANAGER)
  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    return this.usersService.toSafeEntity(user);
  }

  @Version(ApiVersions.V1)
  @Roles(AppRole.ADMIN)
  @Patch(':id')
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, payload);
    return this.usersService.toSafeEntity(user);
  }

  @Version(ApiVersions.V1)
  @Roles(AppRole.ADMIN)
  @Delete(':id')
  @ApiOkResponse({ type: DeleteUserResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<DeleteUserResponseDto> {
    await this.usersService.remove(id);
    return { success: true };
  }
}
