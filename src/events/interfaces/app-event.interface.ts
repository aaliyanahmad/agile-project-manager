import { EventType } from "../enums/event-type.enum";

export interface AppEvent {
  eventId: string;
  type: EventType;
  data: {
    ticketId?: string;
    projectId?: string;
    performedBy: string;
    targetUsers: string[];
    metadata?: any;
  };
  createdAt: Date;
}