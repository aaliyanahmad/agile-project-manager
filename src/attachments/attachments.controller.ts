import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Attachment } from '../entities/attachment.entity';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Attachments')
@ApiBearerAuth()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  /**
   * Upload attachment to a ticket
   */
  @Post('tickets/:ticketId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @ApiOperation({
    summary: 'Upload attachment to ticket',
    description: 'Upload a file as an attachment to a ticket',
  })
  @ApiParam({
    name: 'ticketId',
    description: 'The ticket UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to attach',
    type: 'multipart/form-data',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to attach to ticket',
        },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({
    description: 'Attachment created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ticketId: '550e8400-e29b-41d4-a716-446655440001',
        commentId: null,
        fileUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.pdf',
        fileName: 'document.pdf',
        fileSize: 102400,
        uploadedById: '550e8400-e29b-41d4-a716-446655440002',
        createdAt: '2026-04-14T10:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid file or file too large' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Access denied to this workspace' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  async uploadToTicket(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ success: true; data: Attachment }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const attachment = await this.attachmentsService.uploadToTicket(
      ticketId,
      user.id,
      file,
    );

    return {
      success: true,
      data: attachment,
    };
  }

  /**
   * Upload attachment to a comment
   */
  @Post('comments/:commentId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @ApiOperation({
    summary: 'Upload attachment to comment',
    description: 'Upload a file as an attachment to a comment',
  })
  @ApiParam({
    name: 'commentId',
    description: 'The comment UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to attach',
    type: 'multipart/form-data',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to attach to comment',
        },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({
    description: 'Attachment created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ticketId: null,
        commentId: '550e8400-e29b-41d4-a716-446655440001',
        fileUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.pdf',
        fileName: 'document.pdf',
        fileSize: 102400,
        uploadedById: '550e8400-e29b-41d4-a716-446655440002',
        createdAt: '2026-04-14T10:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid file or file too large' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Access denied to this workspace' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  async uploadToComment(
    @Param('commentId') commentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ success: true; data: Attachment }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const attachment = await this.attachmentsService.uploadToComment(
      commentId,
      user.id,
      file,
    );

    return {
      success: true,
      data: attachment,
    };
  }

  /**
   * Get attachments for a ticket
   */
  @Get('tickets/:ticketId/attachments')
  @ApiOperation({
    summary: 'Get ticket attachments',
    description: 'Get all attachments for a ticket',
  })
  @ApiParam({
    name: 'ticketId',
    description: 'The ticket UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Attachments retrieved successfully',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          ticketId: '550e8400-e29b-41d4-a716-446655440001',
          commentId: null,
          fileUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.pdf',
          fileName: 'document.pdf',
          fileSize: 102400,
          uploadedById: '550e8400-e29b-41d4-a716-446655440002',
          uploadedBy: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'John Doe',
          },
          createdAt: '2026-04-14T10:00:00Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Access denied to this workspace' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  async getTicketAttachments(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: true; data: Attachment[] }> {
    const attachments = await this.attachmentsService.getTicketAttachments(
      ticketId,
      user.id,
    );

    return {
      success: true,
      data: attachments,
    };
  }

  /**
   * Get attachments for a comment
   */
  @Get('comments/:commentId/attachments')
  @ApiOperation({
    summary: 'Get comment attachments',
    description: 'Get all attachments for a comment',
  })
  @ApiParam({
    name: 'commentId',
    description: 'The comment UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Attachments retrieved successfully',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          ticketId: null,
          commentId: '550e8400-e29b-41d4-a716-446655440001',
          fileUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.pdf',
          fileName: 'document.pdf',
          fileSize: 102400,
          uploadedById: '550e8400-e29b-41d4-a716-446655440002',
          uploadedBy: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'John Doe',
          },
          createdAt: '2026-04-14T10:00:00Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Access denied to this workspace' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  async getCommentAttachments(
    @Param('commentId') commentId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: true; data: Attachment[] }> {
    const attachments = await this.attachmentsService.getCommentAttachments(
      commentId,
      user.id,
    );

    return {
      success: true,
      data: attachments,
    };
  }

  /**
   * Delete attachment
   */
  @Delete('attachments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete attachment',
    description: 'Delete an attachment (only uploader can delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'The attachment UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Attachment deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Attachment deleted successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Only uploader can delete' })
  @ApiNotFoundResponse({ description: 'Attachment not found' })
  async deleteAttachment(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ success: true; message: string }> {
    await this.attachmentsService.deleteAttachment(id, user.id);

    return {
      success: true,
      message: 'Attachment deleted successfully',
    };
  }
}
