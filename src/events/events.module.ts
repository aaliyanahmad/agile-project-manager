import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisherService } from './publisher/event-publisher.service';
import { EventSubscriberService } from './subscriber/event-subscriber.service';
import { EventHandlerService } from './handlers/event-handler.service';
import { ProcessedEvent } from './entities/processed-event.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessedEvent]), NotificationsModule],
  providers: [EventPublisherService, EventSubscriberService, EventHandlerService],
  exports: [EventPublisherService, EventSubscriberService, EventHandlerService],
})
export class EventsModule {}
