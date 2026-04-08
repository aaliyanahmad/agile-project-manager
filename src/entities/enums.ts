export enum WorkspaceMemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum SprintStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum TicketStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum StatusCategory {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum UserTheme {
  DARK = 'DARK',
  LIGHT = 'LIGHT',
}

export enum NotificationType {
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  MENTIONED = 'MENTIONED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  SPRINT_STARTED = 'SPRINT_STARTED',
  SPRINT_COMPLETED = 'SPRINT_COMPLETED',
}

export enum GitLinkType {
  PR = 'PR',
  COMMIT = 'COMMIT',
}
