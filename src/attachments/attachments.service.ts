import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { Attachment } from '../entities/attachment.entity';
import { Ticket } from '../entities/ticket.entity';
import { Comment } from '../entities/comment.entity';
import { User } from '../entities/user.entity';
import { UploadService } from '../upload/upload.service';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Project } from '../entities/project.entity';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../entities/activity-action.enum';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly uploadService: UploadService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Upload attachment to ticket
   */
  async uploadToTicket(
    ticketId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Attachment> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate ticket exists and get its project
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Validate user belongs to the ticket's workspace
    const workspaceMember = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId: ticket.project.workspaceId,
      },
    });

    if (!workspaceMember) {
      throw new ForbiddenException(
        'You do not have access to this workspace',
      );
    }

    // Upload file
    const uploadResult = await this.uploadService.uploadFile(file);

    // Create and save attachment record
    const attachment = this.attachmentRepository.create({
      ticketId,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      uploadedById: userId,
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);

    // Log activity for attachment upload
    try {
      await this.activityService.log({
        ticketId,
        userId,
        action: ActivityAction.ATTACHMENT_ADDED,
        metadata: {
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          attachmentId: savedAttachment.id,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log activity for attachment upload: ${error.message}`,
      );
      // Don't throw - attachment was saved successfully, logging failure is non-critical
    }

    return savedAttachment;
  }

  /**
   * Upload attachment to comment
   */
  async uploadToComment(
    commentId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Attachment> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate comment exists and get its ticket and project
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['ticket', 'ticket.project'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Validate user belongs to the ticket's workspace
    const workspaceMember = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId: comment.ticket.project.workspaceId,
      },
    });

    if (!workspaceMember) {
      throw new ForbiddenException(
        'You do not have access to this workspace',
      );
    }

    // Upload file
    const uploadResult = await this.uploadService.uploadFile(file);

    // Create and save attachment record
    const attachment = this.attachmentRepository.create({
      commentId,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      uploadedById: userId,
    });

    return this.attachmentRepository.save(attachment);
  }

  /**
   * Get attachments for a ticket
   */
  async getTicketAttachments(
    ticketId: string,
    userId: string,
  ): Promise<Attachment[]> {
    // Validate ticket exists
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['project'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Validate user belongs to the ticket's workspace
    const workspaceMember = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId: ticket.project.workspaceId,
      },
    });

    if (!workspaceMember) {
      throw new ForbiddenException(
        'You do not have access to this workspace',
      );
    }

    // Get attachments
    return this.attachmentRepository.find({
      where: { ticketId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get attachments for a comment
   */
  async getCommentAttachments(
    commentId: string,
    userId: string,
  ): Promise<Attachment[]> {
    // Validate comment exists
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['ticket', 'ticket.project'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Validate user belongs to the ticket's workspace
    const workspaceMember = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId: comment.ticket.project.workspaceId,
      },
    });

    if (!workspaceMember) {
      throw new ForbiddenException(
        'You do not have access to this workspace',
      );
    }

    // Get attachments
    return this.attachmentRepository.find({
      where: { commentId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete attachment
   * Only the uploader can delete
   */
  async deleteAttachment(
    attachmentId: string,
    userId: string,
  ): Promise<void> {
    // Get attachment
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Check if user is the one who uploaded it
    if (attachment.uploadedById !== userId) {
      throw new ForbiddenException(
        'You can only delete attachments you uploaded',
      );
    }

    // Extract filename from URL
    const filename = path.basename(attachment.fileUrl);

    // Delete file from filesystem using UploadService
    try {
      await this.uploadService.deleteFile(filename);
    } catch (error) {
      this.logger.warn(
        `Could not delete file from filesystem: ${filename}. Error: ${error.message}`,
      );
      // Don't fail if file deletion fails - proceed to delete DB record
    }

    // Delete database record
    await this.attachmentRepository.delete(attachmentId);
    this.logger.log(`Deleted attachment record: ${attachmentId}`);
  }

  /**
   * Get single attachment with validation
   */
  async getAttachment(attachmentId: string): Promise<Attachment> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['uploadedBy'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }
}
