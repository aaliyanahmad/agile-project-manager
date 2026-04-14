import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUnusedFeatures1740000000003 implements MigrationInterface {
  name = 'RemoveUnusedFeatures1740000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE "git_links" DROP CONSTRAINT "FK_git_links_ticket_id"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "git_links"`);
    await queryRunner.query(`DROP TABLE "notifications"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "git_link_type_enum"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate enums
    await queryRunner.query(`CREATE TYPE "notification_type_enum" AS ENUM('TICKET_ASSIGNED', 'COMMENT_ADDED', 'MENTIONED', 'STATUS_CHANGED', 'SPRINT_STARTED', 'SPRINT_COMPLETED')`);
    await queryRunner.query(`CREATE TYPE "git_link_type_enum" AS ENUM('PR', 'COMMIT')`);

    // Recreate tables
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
  }
}
