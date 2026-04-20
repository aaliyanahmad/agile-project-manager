import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Create a notification for a user
   * Prevents duplicates by using unique eventId constraint
   */
  async createNotification(data: {
    eventId: string;
    userId: string;
    type: string;
    ticketId?: string;
    message: string;
    metadata?: any;
  }): Promise<NotificationDocument | null> {
    try {
      // Attempt to create notification
      const notification = new this.notificationModel({
        eventId: data.eventId,
        userId: data.userId,
        type: data.type,
        ticketId: data.ticketId,
        message: data.message,
        metadata: data.metadata || {},
        isRead: false,
      });

      await notification.save();
      this.logger.debug(`✓ Notification created for user ${data.userId}: ${data.message}`);
      return notification;
    } catch (error) {
      // If duplicate (eventId already exists), silently skip
      if (error.code === 11000) {
        this.logger.debug(`⚠️ Notification already exists for eventId: ${data.eventId}`);
        return null;
      }
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination
   * Returns sorted by createdAt (newest first)
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 5,
  ): Promise<{
    data: NotificationDocument[];
    total: number;
    page: number;
    limit: number;
    unreadCount: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ userId }),
      this.notificationModel.countDocuments({ userId, isRead: false }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      unreadCount,
    };
  }

  /**
   * Mark a single notification as read
   * Only if user owns the notification
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationDocument | null> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true },
    );

    if (notification) {
      this.logger.debug(`✓ Notification ${notificationId} marked as read`);
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );

    this.logger.debug(`✓ Marked ${result.modifiedCount} notifications as read for user ${userId}`);
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false });
  }

  /**
   * Check if a notification already exists (for idempotency)
   */
  async notificationExists(eventId: string): Promise<boolean> {
    const count = await this.notificationModel.countDocuments({ eventId });
    return count > 0;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      userId,
    });

    return result.deletedCount > 0;
  }

  /**
   * DEBUG: Get all notifications from database (for testing)
   * TODO: Remove before production
   */
  async getAllNotifications(limit: number = 100): Promise<NotificationDocument[]> {
    this.logger.warn(`DEBUG: Fetching all ${limit} notifications from database`);
    return this.notificationModel.find({}).limit(limit).exec();
  }
}
