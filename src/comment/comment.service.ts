import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { Ticket } from '../entities/ticket.entity';
import { Project } from '../entities/project.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { EventPublisherService } from '../events/publisher/event-publisher.service';
import { EventType } from '../events/enums/event-type.enum';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventPublisherService: EventPublisherService,
  ) {}

  /**
   * Add a comment to a ticket
   */
  async addComment(
    ticketId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<{ success: true; data: Comment }> {
    // Validate ticket exists and get project details for workspace validation
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project', 'assignees'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Validate user belongs to ticket's workspace
    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    // Create comment
    const comment = this.commentRepository.create({
      ticketId,
      userId,
      content: dto.content,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Return comment with user data
    const commentWithUser = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
      select: {
        id: true,
        ticketId: true,
        userId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          name: true,
        },
      },
    });

    // Publish event
    const assigneeIds = (ticket.assignees || []).map((a) => a.id);
    const event = this.eventPublisherService.createEvent(
      EventType.COMMENT_ADDED,
      {
        ticketId,
        projectId: ticket.projectId,
        performedBy: userId,
        targetUsers: assigneeIds,
      },
    );
    await this.eventPublisherService.publish(event);

    return {
      success: true,
      data: commentWithUser!,
    };
  }

  /**
   * Get paginated comments for a ticket
   */
  async getComments(
    ticketId: string,
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Comment>> {
    // Validate ticket exists and get project details for workspace validation
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Validate user belongs to ticket's workspace
    await this.validateUserInWorkspace(userId, ticket.project.workspaceId);

    const page = paginationDto.page || 1;
    const limit = Math.min(paginationDto.limit || 5, 50);
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.commentRepository.count({
      where: { ticketId },
    });

    // Get comments with user and attachments data using query builder
    const comments = await this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.attachments', 'attachments')
      .leftJoinAndSelect('attachments.uploadedBy', 'uploadedByUser')
      .where('comment.ticketId = :ticketId', { ticketId })
      .orderBy('comment.createdAt', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Transform comments to include only needed fields and format attachments
    const transformedComments = comments.map(comment => ({
      id: comment.id,
      ticketId: comment.ticketId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.user.id,
        name: comment.user.name,
      },
      attachments: (comment.attachments || []).map(att => ({
        id: att.id,
        fileUrl: att.fileUrl,
        fileName: att.fileName,
        fileSize: att.fileSize,
        uploadedBy: {
          id: att.uploadedBy.id,
          name: att.uploadedBy.name,
        },
        createdAt: att.createdAt,
      })),
    }));

    return {
      success: true,
      data: {
        items: transformedComments as any,
        total,
        page,
        limit,
      },
    };
  }

  /**
   * Update a comment (only by author)
   */
  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<{ success: true; data: Comment }> {
    // Find comment
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Validate ownership
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Update content if provided
    if (dto.content) {
      comment.content = dto.content;
    }

    const updatedComment = await this.commentRepository.save(comment);

    // Return updated comment with user data
    const commentWithUser = await this.commentRepository.findOne({
      where: { id: updatedComment.id },
      relations: ['user'],
      select: {
        id: true,
        ticketId: true,
        userId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          name: true,
        },
      },
    });

    return {
      success: true,
      data: commentWithUser!,
    };
  }

  /**
   * Delete a comment (only by author)
   */
  async deleteComment(
    commentId: string,
    userId: string,
  ): Promise<{ success: true }> {
    // Find comment
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Validate ownership
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete comment
    await this.commentRepository.delete(commentId);

    return { success: true };
  }

  /**
   * Detect mentions in comment content
   * Returns array of mentioned usernames (without validation)
   */
  private detectMentions(content: string): string[] {
    const regex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Validate user belongs to workspace
   */
  private async validateUserInWorkspace(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied: User does not belong to this workspace');
    }
  }
}
