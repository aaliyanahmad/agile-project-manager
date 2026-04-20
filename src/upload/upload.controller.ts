import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiTags('Upload')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload a file (temporary testing endpoint)
   * Accepts image, PDF, text, and Word documents
   * Maximum file size: 5MB
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @ApiOperation({
    summary: 'Upload a file',
    description:
      'Upload a file to the server. Supports images (JPEG, PNG), PDF, text files, and Word documents. Max size: 5MB',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    type: 'multipart/form-data',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({
    description: 'File uploaded successfully',
    schema: {
      example: {
        success: true,
        data: {
          fileUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
          fileName: 'my-image.jpg',
          fileSize: 102400,
          mimeType: 'image/jpeg',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid file or file exceeds size limit',
    schema: {
      example: {
        statusCode: 400,
        message: 'File size exceeds maximum allowed size of 5MB',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - JWT token missing or invalid',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.uploadService.uploadFile(file);

    return {
      success: true,
      data: result,
    };
  }
}
