import { Controller, Get, Patch, Param, Query, BadRequestException, NotFoundException, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { NotificationsService } from './notifications.service';
import { GetNotificationsDto, MarkAsReadDto, MarkAllAsReadDto } from './dto/notification.dto';

@ApiTags('Notifications')
@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /users/me/notifications
   * Get notifications for current user with pagination
   */
  @Get('users/me/notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Notifications retrieved', type: GetNotificationsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserNotifications(
    @CurrentUser() currentUser: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<GetNotificationsDto> {
    const userId = currentUser.id;
    this.logger.debug(`Fetching notifications for user: ${userId}`);

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 5;

    if (pageNum < 1 || limitNum < 1) {
      throw new BadRequestException('Page and limit must be positive integers');
    }

    const result = await this.notificationsService.getUserNotifications(
      userId,
      pageNum,
      limitNum,
    );

    // Map Mongoose documents to plain DTOs
    return {
      data: result.data.map((doc) => ({
        _id: doc._id.toString(),
        eventId: doc.eventId,
        userId: doc.userId,
        type: doc.type,
        ticketId: doc.ticketId,
        message: doc.message,
        metadata: doc.metadata,
        isRead: doc.isRead,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      unreadCount: result.unreadCount,
    };
  }

  /**
   * PATCH /notifications/:id/read
   * Mark a single notification as read
   */
  @Patch('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Notification marked as read', type: MarkAsReadDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() currentUser: User,
  ): Promise<MarkAsReadDto> {
    const userId = currentUser.id;

    if (!notificationId) {
      throw new BadRequestException('Notification ID is required');
    }

    const notification = await this.notificationsService.markAsRead(
      notificationId,
      userId,
    );

    if (!notification) {
      throw new NotFoundException('Notification not found or does not belong to user');
    }

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  /**
   * PATCH /notifications/read-all
   * Mark all notifications as read for current user
   */
  @Patch('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'All notifications marked as read', type: MarkAllAsReadDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@CurrentUser() currentUser: User): Promise<MarkAllAsReadDto> {
    const userId = currentUser.id;

    const result = await this.notificationsService.markAllAsRead(userId);

    return {
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * GET /notifications/unread-count
   * Get count of unread notifications for current user
   */
  @Get('notifications/unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Unread count', schema: { example: { unreadCount: 5 } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@CurrentUser() currentUser: User) {
    const userId = currentUser.id;

    const unreadCount = await this.notificationsService.getUnreadCount(userId);

    return { unreadCount };
  }

  /**
   * DEBUG ENDPOINT - Returns ALL notifications from database
   * TODO: Remove this endpoint before production
   * GET /notifications/debug/all
   */
  @Get('notifications/debug/all')
  @ApiResponse({ status: 200, description: 'All notifications in database (DEBUG)' })
  async debugGetAll() {
    this.logger.warn('⚠️  DEBUG endpoint called - returning all notifications');
    // Access private method through bracket notation (NOT IDEAL - refactor before prod)
    const allNotifications = await (this.notificationsService as any).notificationModel.find({}).limit(100).exec();
    
    return {
      debug: true,
      message: 'DEBUG: This endpoint returns ALL notifications for troubleshooting',
      totalCount: allNotifications.length,
      notifications: allNotifications.map((doc: any) => ({
        _id: doc._id.toString(),
        eventId: doc.eventId,
        userId: doc.userId,
        type: doc.type,
        ticketId: doc.ticketId,
        message: doc.message,
        isRead: doc.isRead,
        createdAt: doc.createdAt,
      })),
    };
  }

}
