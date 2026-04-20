import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({ example: 'uuid' })
  _id: string;

  @ApiProperty({ example: 'TICKET_CREATED_uuid_userId' })
  eventId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({ example: 'TICKET_CREATED' })
  type: string;

  @ApiProperty({ example: 'uuid-ticket-id', required: false })
  ticketId?: string;

  @ApiProperty({ example: 'Ticket created' })
  message: string;

  @ApiProperty({ example: {} })
  metadata?: any;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-04-14T10:30:00Z', required: false })
  createdAt?: Date;

  @ApiProperty({ example: '2026-04-14T10:30:00Z', required: false })
  updatedAt?: Date;
}

export class GetNotificationsDto {
  @ApiProperty({ type: [NotificationDto] })
  data: NotificationDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 5 })
  limit: number;

  @ApiProperty({ example: 5 })
  unreadCount: number;
}

export class MarkAsReadDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Notification marked as read' })
  message: string;
}

export class MarkAllAsReadDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'All notifications marked as read' })
  message: string;

  @ApiProperty({ example: 5 })
  modifiedCount: number;
}
