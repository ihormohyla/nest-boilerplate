import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseIntPipe,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  ConfirmFileUploadDto,
  CreatePresignedUrlDto,
  DeleteFileResponseDto,
  FileResponseDto,
  PresignedUploadResponseDto,
} from './dto';
import { FilesService } from './files.service';
import { ApiVersions } from '../../common/constants/api-versions.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('files')
@ApiBearerAuth('access-token')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Version(ApiVersions.V1)
  @Post('presign')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreatePresignedUrlDto })
  @ApiOkResponse({ type: PresignedUploadResponseDto })
  createPresignedUrl(
    @Body() payload: CreatePresignedUrlDto,
    @CurrentUser() user: { id: number },
  ): Promise<PresignedUploadResponseDto> {
    return this.filesService.createPresignedUpload(user.id, payload);
  }

  @Version(ApiVersions.V1)
  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: ConfirmFileUploadDto })
  @ApiOkResponse({ type: FileResponseDto })
  confirmUpload(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: ConfirmFileUploadDto,
    @CurrentUser() user: { id: number },
  ): Promise<FileResponseDto> {
    return this.filesService.confirmUpload(id, user.id, payload);
  }

  @Version(ApiVersions.V1)
  @Delete(':key')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: DeleteFileResponseDto })
  remove(
    @Param('key') key: string,
    @CurrentUser() user: { id: number },
  ): Promise<DeleteFileResponseDto> {
    return this.filesService.removeByKey(key, user.id);
  }
}
