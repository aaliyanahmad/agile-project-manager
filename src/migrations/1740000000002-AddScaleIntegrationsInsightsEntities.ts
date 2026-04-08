import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScaleIntegrationsInsightsEntities1740000000002 implements MigrationInterface {
  name = 'AddScaleIntegrationsInsightsEntities1740000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_type_enum" AS ENUM('TICKET_ASSIGNED', 'COMMENT_ADDED', 'MENTIONED', 'STATUS_CHANGED', 'SPRINT_STARTED', 'SPRINT_COMPLETED')`);
    await queryRunner.query(`CREATE TYPE "git_link_type_enum" AS ENUM('PR', 'COMMIT')`);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "reference_type" varchar(50) NOT NULL,
        "reference_id" uuid NOT NULL,
        "content" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_notification_user_id" ON "notifications" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_notification_is_read" ON "notifications" ("is_read")`);
    await queryRunner.query(`CREATE INDEX "idx_notification_created_at" ON "notifications" ("created_at")`);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticket_id" uuid,
        "comment_id" uuid,
        "file_url" text NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_size" integer NOT NULL,
        "uploaded_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_attachments_reference" CHECK (("ticket_id" IS NOT NULL AND "comment_id" IS NULL) OR ("ticket_id" IS NULL AND "comment_id" IS NOT NULL))
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_attachment_ticket_id" ON "attachments" ("ticket_id")`);
    await queryRunner.query(`CREATE INDEX "idx_attachment_comment_id" ON "attachments" ("comment_id")`);
    await queryRunner.query(`CREATE INDEX "idx_attachment_uploaded_by" ON "attachments" ("uploaded_by")`);
    await queryRunner.query(`
      ALTER TABLE "attachments"
      ADD CONSTRAINT "FK_attachments_ticket_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "attachments"
      ADD CONSTRAINT "FK_attachments_comment_id" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "attachments"
      ADD CONSTRAINT "FK_attachments_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "git_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "type" "git_link_type_enum" NOT NULL,
        "external_id" varchar(255) NOT NULL,
        "title" varchar(255),
        "url" text NOT NULL,
        "status" varchar(50),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_git_links" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_git_link_ticket_id" ON "git_links" ("ticket_id")`);
    await queryRunner.query(`CREATE INDEX "idx_git_link_external_id" ON "git_links" ("external_id")`);
    await queryRunner.query(`
      ALTER TABLE "git_links"
      ADD CONSTRAINT "FK_git_links_ticket_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN "story_points" numeric`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "story_points"`);

    await queryRunner.query(`DROP TABLE "git_links"`);
    await queryRunner.query(`DROP TABLE "attachments"`);
    await queryRunner.query(`DROP TABLE "notifications"`);

    await queryRunner.query(`DROP TYPE "git_link_type_enum"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
