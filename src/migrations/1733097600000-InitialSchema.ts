import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1733097600000 implements MigrationInterface {
  name = 'InitialSchema1733097600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "workspace_role_enum" AS ENUM('ADMIN', 'MEMBER')
    `);
    await queryRunner.query(`
      CREATE TYPE "sprint_status_enum" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED')
    `);
    await queryRunner.query(`
      CREATE TYPE "ticket_status_enum" AS ENUM('TODO', 'IN_PROGRESS', 'DONE')
    `);
    await queryRunner.query(`
      CREATE TYPE "ticket_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH')
    `);
    await queryRunner.query(`
      CREATE TYPE "activity_action_enum" AS ENUM(
        'TICKET_CREATED',
        'TITLE_UPDATED',
        'DESCRIPTION_UPDATED',
        'STATUS_CHANGED',
        'PRIORITY_CHANGED',
        'ASSIGNEE_CHANGED',
        'MOVED_TO_SPRINT',
        'MOVED_TO_BACKLOG',
        'SPRINT_CHANGED'
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(200) NOT NULL,
        "email" varchar(320) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_96aac72f1574b88752e9fb00089" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_user_email" ON "users" ("email")
    `);

    // Create workspaces table
    await queryRunner.query(`
      CREATE TABLE "workspaces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "owner_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0986565e7de0e2c1a4e055e2e7a" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD CONSTRAINT "FK_workspaces_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // Create workspace_members table
    await queryRunner.query(`
      CREATE TABLE "workspace_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "workspace_role_enum" NOT NULL,
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_members" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "FK_workspace_members_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "FK_workspace_members_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_workspace_members_workspace_user" ON "workspace_members" ("workspace_id", "user_id")
    `);

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "key" varchar NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "FK_projects_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_project_key" ON "projects" ("key")
    `);

    // Create sprints table
    await queryRunner.query(`
      CREATE TABLE "sprints" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "name" varchar,
        "status" "sprint_status_enum" NOT NULL DEFAULT 'PLANNED',
        "start_date" date,
        "end_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sprints" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "sprints"
      ADD CONSTRAINT "FK_sprints_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_sprint_project_id" ON "sprints" ("project_id")
    `);

    // Create tickets table
    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "sprint_id" uuid,
        "ticket_key" varchar(30) NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "status" "ticket_status_enum" NOT NULL DEFAULT 'TODO',
        "priority" "ticket_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "assignee_id" uuid,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tickets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets"
      ADD CONSTRAINT "FK_tickets_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets"
      ADD CONSTRAINT "FK_tickets_sprint_id" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets"
      ADD CONSTRAINT "FK_tickets_assignee_id" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets"
      ADD CONSTRAINT "FK_tickets_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_project_id" ON "tickets" ("project_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_sprint_id" ON "tickets" ("sprint_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_assignee_id" ON "tickets" ("assignee_id")
    `);

    // Create comments table
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "PK_comments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "comments"
      ADD CONSTRAINT "FK_comments_ticket_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "comments"
      ADD CONSTRAINT "FK_comments_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_comment_ticket_id" ON "comments" ("ticket_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_comment_user_id" ON "comments" ("user_id")
    `);

    // Create activity_logs table
    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "action" "activity_action_enum" NOT NULL,
        "metadata" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_ticket_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_activity_log_ticket_id" ON "activity_logs" ("ticket_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_activity_log_user_id" ON "activity_logs" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "activity_logs"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "tickets"`);
    await queryRunner.query(`DROP TABLE "sprints"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TABLE "workspace_members"`);
    await queryRunner.query(`DROP TABLE "workspaces"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "activity_action_enum"`);
    await queryRunner.query(`DROP TYPE "ticket_priority_enum"`);
    await queryRunner.query(`DROP TYPE "ticket_status_enum"`);
    await queryRunner.query(`DROP TYPE "sprint_status_enum"`);
    await queryRunner.query(`DROP TYPE "workspace_role_enum"`);
  }
}