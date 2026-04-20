import { AppEvent } from '../../events/interfaces/app-event.interface';
import { EventType } from '../../events/enums/event-type.enum';

/**
 * Generate a user-friendly message for a notification
 * based on the event type and data
 */
export function generateNotificationMessage(event: AppEvent): string {
  switch (event.type) {
    case EventType.TICKET_CREATED:
      return `Ticket "${event.data.metadata?.ticketTitle || 'Untitled'}" was created`;

    case EventType.ASSIGNEE_ADDED:
      return 'You were assigned to a ticket';

    case EventType.COMMENT_ADDED:
      return `New comment: "${event.data.metadata?.commentPreview || 'New comment'}"`;

    case EventType.STATUS_CHANGED:
      const oldStatus = event.data.metadata?.oldStatus || 'Unknown';
      const newStatus = event.data.metadata?.newStatus || 'Unknown';
      return `Ticket status changed from "${oldStatus}" to "${newStatus}"`;

    case EventType.ATTACHMENT_ADDED:
      return `File "${event.data.metadata?.fileName || 'Untitled'}" was added to ticket`;

    default:
      return 'New notification';
  }
}
