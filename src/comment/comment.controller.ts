import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User } from '../entities/user.entity';
import { Comment } from '../entities/comment.entity';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Comments')
@ApiBearerAuth()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  /**
   * Add a comment to a ticket
   */
  @Post('tickets/:ticketId/comments')
  @ApiOperation({ summary: 'Add comment to ticket' })
  @ApiParam({
    name: 'ticketId',
    description: 'The ticket UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: CreateCommentDto })
  @ApiCreatedResponse({
    description: 'Comment created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          ticketId: '550e8400-e29b-41d4-a716-446655440001',
          userId: '550e8400-e29b-41d4-a716-446655440002',
          content: 'This is a comment',
          createdAt: '2025-01-15T10:00:00Z',
          updatedAt: null,
          user: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'John Doe',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  async addComment(
    @Param('ticketId') ticketId: string,
    @Body(new ValidationPipe()) dto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentService.addComment(ticketId, user.id, dto);
  }

  /**
   * Get comments for a ticket (paginated)
   */
  @Get('tickets/:ticketId/comments')
  @ApiOperation({ summary: 'Get comments for a ticket' })
  @ApiParam({
    name: 'ticketId',
    description: 'The ticket UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (starts from 1)',
    required: false,
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page (max 50)',
    required: false,
    type: 'number',
    example: 5,
  })
  @ApiOkResponse({
    description: 'Comments retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              ticketId: '550e8400-e29b-41d4-a716-446655440001',
              userId: '550e8400-e29b-41d4-a716-446655440002',
              content: 'This is a comment',
              createdAt: '2025-01-15T10:00:00Z',
              updatedAt: null,
              user: {
                id: '550e8400-e29b-41d4-a716-446655440002',
                name: 'John Doe',
              },
              attachments: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440003',
                  fileUrl: '/uploads/document.pdf',
                  fileName: 'document.pdf',
                  fileSize: 512000,
                  uploadedBy: {
                    id: '550e8400-e29b-41d4-a716-446655440002',
                    name: 'John Doe',
                  },
                  createdAt: '2025-01-15T10:05:00Z',
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          limit: 5,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  async getComments(
    @Param('ticketId') ticketId: string,
    @Query(new ValidationPipe({ transform: true, skipMissingProperties: true }))
    paginationDto: PaginationDto,
    @CurrentUser() user: User,
  ) {
    return this.commentService.getComments(ticketId, user.id, paginationDto);
  }

  /**
   * Update a comment (only by author)
   */
  @Patch('comments/:id')
  @ApiOperation({ summary: 'Update comment' })
  @ApiParam({
    name: 'id',
    description: 'The comment UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateCommentDto })
  @ApiOkResponse({
    description: 'Comment updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          ticketId: '550e8400-e29b-41d4-a716-446655440001',
          userId: '550e8400-e29b-41d4-a716-446655440002',
          content: 'This is an updated comment',
          createdAt: '2025-01-15T10:00:00Z',
          updatedAt: '2025-01-15T10:30:00Z',
          user: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'John Doe',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiForbiddenResponse({ description: 'Can only edit own comments' })
  async updateComment(
    @Param('id') commentId: string,
    @Body(new ValidationPipe()) dto: UpdateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentService.updateComment(commentId, user.id, dto);
  }

  /**
   * Delete a comment (only by author)
   */
  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiParam({
    name: 'id',
    description: 'The comment UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Comment deleted successfully',
    schema: {
      example: {
        success: true,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiForbiddenResponse({ description: 'Can only delete own comments' })
  async deleteComment(
    @Param('id') commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.commentService.deleteComment(commentId, user.id);
  }
}
