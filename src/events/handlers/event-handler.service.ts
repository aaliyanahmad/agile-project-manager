import { Injectable, Logger } from '@nestjs/common';
import { AppEvent } from '../interfaces/app-event.interface';
import { EventType } from '../enums/event-type.enum';
import { generateNotificationMessage } from '../../notifications/utils/notification-message.generator';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * EventHandlerService
 * Contains business logic for processing different event types
 * Separates concerns: subscriber only receives, handler processes
 * 
 * Error Handling Strategy:
 * - Non-critical failures (notifications) are logged but don't fail the event
 * - Critical failures (data consistency) are thrown for retry
 */
@Injectable()
export class EventHandlerService {
  private readonly logger = new Logger(EventHandlerService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Main handler for all event types
   * Routes events to specific handlers based on type
   * Throws errors to trigger Pub/Sub retry on failure
   */
  async handleEvent(event: AppEvent): Promise<void> {
    try {
      this.logger.debug(
        `Processing event: type=${event.type}, eventId=${event.eventId}`,
      );

      // Validate event data
      if (!event || !event.type) {
        throw new Error('Invalid event: missing type');
      }

      if (!event.data) {
        throw new Error('Invalid event: missing data');
      }

      switch (event.type) {
        case EventType.TICKET_CREATED:
          await this.handleTicketCreated(event);
          break;

        case EventType.ASSIGNEE_ADDED:
          await this.handleAssigneeAdded(event);
          break;

        case EventType.COMMENT_ADDED:
          await this.handleCommentAdded(event);
          break;

        case EventType.STATUS_CHANGED:
          await this.handleStatusChanged(event);
          break;

        case EventType.ATTACHMENT_ADDED:
          await this.handleAttachmentAdded(event);
          break;

        default:
          this.logger.warn(`Unknown event type: ${event.type}`);
      }

      this.logger.debug(`✓ Event processed: ${event.type} [${event.eventId}]`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Event handler failed: ${errorMsg}`,
        error instanceof Error ? error.stack : '',
      );
      // Re-throw to signal failure to subscriber (triggers retry)
      throw error;
    }
  }

  /**
   * Handle TICKET_CREATED event
   */
  private async handleTicketCreated(event: AppEvent): Promise<void> {
    try {
      const ticketId = event.data.ticketId;
      const performedBy = event.data.performedBy;

      this.logger.debug(
        `TICKET_CREATED: ticketId=${ticketId}, creator=${performedBy}`,
      );

      // Create notifications for target users (project members)
      await this.createNotificationsForUsers(
        event,
        generateNotificationMessage(event),
      );

      // TODO: Add business logic here
      // - Create activity record
      // - Trigger any post-creation workflows
    } catch (error) {
      this.logger.error(
        `Error handling TICKET_CREATED: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Handle ASSIGNEE_ADDED event
   */
  private async handleAssigneeAdded(event: AppEvent): Promise<void> {
    try {
      const ticketId = event.data.ticketId;
      const assigneeCount = event.data.targetUsers?.length || 0;

      this.logger.debug(
        `ASSIGNEE_ADDED: ticketId=${ticketId}, assignees=${assigneeCount}`,
      );

      // Create notifications for assigned users
      await this.createNotificationsForUsers(
        event,
        generateNotificationMessage(event),
      );

      // TODO: Add business logic here
      // - Update user's task queue
      // - Create activity record
    } catch (error) {
      this.logger.error(
        `Error handling ASSIGNEE_ADDED: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Handle COMMENT_ADDED event
   */
  private async handleCommentAdded(event: AppEvent): Promise<void> {
    try {
      const ticketId = event.data.ticketId;
      const author = event.data.performedBy;

      this.logger.debug(
        `COMMENT_ADDED: ticketId=${ticketId}, author=${author}`,
      );

      // Create notifications for ticket watchers/assignees
      await this.createNotificationsForUsers(
        event,
        generateNotificationMessage(event),
      );

      // TODO: Add business logic here
      // - Trigger mention notifications
      // - Create activity record
    } catch (error) {
      this.logger.error(
        `Error handling COMMENT_ADDED: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Handle STATUS_CHANGED event
   */
  private async handleStatusChanged(event: AppEvent): Promise<void> {
    try {
      const ticketId = event.data.ticketId;
      const changedBy = event.data.performedBy;

      this.logger.debug(
        `STATUS_CHANGED: ticketId=${ticketId}, changedBy=${changedBy}`,
      );

      // Create notifications for ticket watchers
      await this.createNotificationsForUsers(
        event,
        generateNotificationMessage(event),
      );

      // TODO: Add business logic here
      // - Update Sprint statistics
      // - Trigger workflow transitions
      // - Create activity record
    } catch (error) {
      this.logger.error(
        `Error handling STATUS_CHANGED: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Handle ATTACHMENT_ADDED event
   */
  private async handleAttachmentAdded(event: AppEvent): Promise<void> {
    try {
      const ticketId = event.data.ticketId;
      const uploadedBy = event.data.performedBy;

      this.logger.debug(
        `ATTACHMENT_ADDED: ticketId=${ticketId}, uploadedBy=${uploadedBy}`,
      );

      // Create notifications for ticket watchers
      await this.createNotificationsForUsers(
        event,
        generateNotificationMessage(event),
      );

      // TODO: Add business logic here
      // - Index attachment for search
      // - Trigger virus scanning if needed
      // - Create activity record
    } catch (error) {
      this.logger.error(
        `Error handling ATTACHMENT_ADDED: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Create notifications for all target users
   * Ensures idempotency by using unique eventId per user
   * Non-blocking: failures log but don't affect event processing
   */
  private async createNotificationsForUsers(
    event: AppEvent,
    message: string,
  ): Promise<void> {
    try {
      const targetUsers = event.data.targetUsers || [];

      if (targetUsers.length === 0) {
        this.logger.debug('No target users for notification');
        return;
      }

      this.logger.debug(
        `Creating notifications for ${targetUsers.length} users`,
      );

      for (const userId of targetUsers) {
        try {
          // Create unique eventId per user to prevent duplicates
          const uniqueEventId = `${event.eventId}_${userId}`;

          await this.notificationsService.createNotification({
            eventId: uniqueEventId,
            userId,
            type: event.type,
            ticketId: event.data.ticketId,
            message,
            metadata: event.data.metadata,
          });

          this.logger.debug(
            `Notification created for user: ${userId}`,
          );
        } catch (userError) {
          // Log per-user failures but continue
          this.logger.warn(
            `Failed to create notification for user ${userId}: ${userError instanceof Error ? userError.message : String(userError)}`,
          );
        }
      }
    } catch (error) {
      // Log but don't throw - notifications are non-critical
      this.logger.error(
        `Error creating notifications for event ${event.eventId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
