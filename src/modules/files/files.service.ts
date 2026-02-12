import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { v4 as uuid } from 'uuid';

import {
  ConfirmFileUploadDto,
  CreatePresignedUrlDto,
  DeleteFileResponseDto,
  FileResponseDto,
  PresignedUploadResponseDto,
} from './dto';
import { FileCreationAttributes, FileEntity, FileStatus } from './models';
import { ErrorMessages } from '../../common/constants/error-messages.constant';
import { BaseService } from '../../common/services';

@Injectable()
export class FilesService extends BaseService<FileEntity> {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly expiresIn: number;
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(FileEntity) fileModel: typeof FileEntity,
  ) {
    super(fileModel);
    const awsConfig = this.configService.get('aws.s3');
    this.bucket = awsConfig?.bucket ?? '';
    this.expiresIn = awsConfig?.presignedExpiresIn ?? 900;
    this.s3 = new S3Client({
      region: awsConfig?.region ?? 'us-east-1',
      credentials: {
        accessKeyId: awsConfig?.accessKeyId ?? '',
        secretAccessKey: awsConfig?.secretAccessKey ?? '',
      },
    });
  }

  async createPresignedUpload(
    userId: number,
    payload: CreatePresignedUrlDto,
    transaction?: Transaction,
  ): Promise<PresignedUploadResponseDto> {
    const directory = payload.directory ? `${payload.directory.replace(/\/+$/, '')}/` : '';
    const key = `${userId}/${directory}${uuid()}-${payload.fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: payload.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: this.expiresIn });

    const creationPayload: FileCreationAttributes = {
      userId,
      key,
      bucket: this.bucket,
      fileName: payload.fileName,
      mimeType: payload.contentType,
      status: FileStatus.PENDING,
      isUsed: false,
    };

    const file = await super.create(creationPayload, transaction);

    return {
      uploadUrl,
      key,
      fileId: file.id,
    };
  }

  async confirmUpload(
    id: number,
    userId: number,
    payload: ConfirmFileUploadDto,
    transaction?: Transaction,
  ): Promise<FileResponseDto> {
    const file = await this.model.findOne({ where: { id, userId }, transaction });
    if (!file) {
      throw new NotFoundException(ErrorMessages.ERRORS.FILE_NOT_FOUND);
    }

    const url = payload.url ?? `https://${this.bucket}.s3.amazonaws.com/${file.key}`;
    const updated = await file.update(
      {
        status: FileStatus.COMPLETED,
        size: payload.size,
        url,
        isUsed: payload.isUsed ?? true,
      },
      transaction ? { transaction } : undefined,
    );

    return this.toResponseDto(updated);
  }

  async removeByKey(
    key: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<DeleteFileResponseDto> {
    // Decode URL-encoded key if needed
    const decodedKey = decodeURIComponent(key);

    const file = await this.model.findOne({ where: { key: decodedKey, userId }, transaction });
    if (!file) {
      throw new NotFoundException(ErrorMessages.ERRORS.FILE_NOT_FOUND);
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: decodedKey,
      });

      await this.s3.send(command);
    } catch (error) {
      // Log error but continue with database deletion
      // In test environments, S3 might not be configured or file might not exist in S3
      this.logger.error('Failed to delete file from S3', error);
      // Don't throw - allow database cleanup even if S3 delete fails
      // This is acceptable in test environments or if file was already deleted from S3
    }

    await file.destroy(transaction ? { transaction } : undefined);

    return { success: true };
  }

  private toResponseDto(file: FileEntity): FileResponseDto {
    return {
      id: file.id,
      userId: file.userId,
      bucket: file.bucket,
      key: file.key,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size ?? null,
      url: file.url ?? null,
      status: file.status,
      isUsed: file.isUsed,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
