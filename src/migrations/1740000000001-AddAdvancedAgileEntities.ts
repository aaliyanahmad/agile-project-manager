import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdvancedAgileEntities1740000000001 implements MigrationInterface {
  name = 'AddAdvancedAgileEntities1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TYPE "status_category_enum" AS ENUM('TODO', 'IN_PROGRESS', 'DONE')`);

    await queryRunner.query(`
      CREATE TABLE "statuses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "category" "status_category_enum" NOT NULL,
        "position" numeric NOT NULL,
        CONSTRAINT "PK_statuses" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_status_project_id" ON "statuses" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "idx_status_project_position" ON "statuses" ("project_id", "position")`);
    await queryRunner.query(`
      ALTER TABLE "statuses"
      ADD CONSTRAINT "FK_statuses_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "labels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "color" varchar(30),
        CONSTRAINT "PK_labels" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_label_project_id" ON "labels" ("project_id")`);
    await queryRunner.query(`
      ALTER TABLE "labels"
      ADD CONSTRAINT "FK_labels_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "ticket_labels" (
        "ticket_id" uuid NOT NULL,
        "label_id" uuid NOT NULL,
        CONSTRAINT "PK_ticket_labels" PRIMARY KEY ("ticket_id", "label_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_ticket_labels_ticket_id" ON "ticket_labels" ("ticket_id")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_labels_label_id" ON "ticket_labels" ("label_id")`);
    await queryRunner.query(`
      ALTER TABLE "ticket_labels"
      ADD CONSTRAINT "FK_ticket_labels_ticket_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "ticket_labels"
      ADD CONSTRAINT "FK_ticket_labels_label_id" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "ticket_assignees" (
        "ticket_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_ticket_assignees" PRIMARY KEY ("ticket_id", "user_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_ticket_assignees_ticket_id" ON "ticket_assignees" ("ticket_id")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_assignees_user_id" ON "ticket_assignees" ("user_id")`);
    await queryRunner.query(`
      ALTER TABLE "ticket_assignees"
      ADD CONSTRAINT "FK_ticket_assignees_ticket_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "ticket_assignees"
      ADD CONSTRAINT "FK_ticket_assignees_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`ALTER TABLE "sprints" ADD COLUMN "goal" text`);

    await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN "status_id" uuid`);
    await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN "parent_ticket_id" uuid`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_status_id" ON "tickets" ("status_id")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_parent_ticket_id" ON "tickets" ("parent_ticket_id")`);
    await queryRunner.query(`
      ALTER TABLE "tickets"
      ADD CONSTRAINT "FK_tickets_status_id" FOREIGN KEY ("status_id") REFERENCES "statuses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets"
      ADD CONSTRAINT "FK_tickets_parent_ticket_id" FOREIGN KEY ("parent_ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      INSERT INTO "statuses" ("id", "project_id", "name", "category", "position")
      SELECT uuid_generate_v4(), "id", 'Todo', 'TODO', 1 FROM "projects"
    `);
    await queryRunner.query(`
      INSERT INTO "statuses" ("id", "project_id", "name", "category", "position")
      SELECT uuid_generate_v4(), "id", 'In Progress', 'IN_PROGRESS', 2 FROM "projects"
    `);
    await queryRunner.query(`
      INSERT INTO "statuses" ("id", "project_id", "name", "category", "position")
      SELECT uuid_generate_v4(), "id", 'Done', 'DONE', 3 FROM "projects"
    `);

    await queryRunner.query(`
      UPDATE "tickets" t
      SET "status_id" = s."id"
      FROM "statuses" s
      WHERE t."project_id" = s."project_id"
        AND t."status" = 'TODO'
        AND s."category" = 'TODO'
    `);
    await queryRunner.query(`
      UPDATE "tickets" t
      SET "status_id" = s."id"
      FROM "statuses" s
      WHERE t."project_id" = s."project_id"
        AND t."status" = 'IN_PROGRESS'
        AND s."category" = 'IN_PROGRESS'
    `);
    await queryRunner.query(`
      UPDATE "tickets" t
      SET "status_id" = s."id"
      FROM "statuses" s
      WHERE t."project_id" = s."project_id"
        AND t."status" = 'DONE'
        AND s."category" = 'DONE'
    `);

    await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status_id" SET NOT NULL`);

    await queryRunner.query(`
      INSERT INTO "ticket_assignees" ("ticket_id", "user_id")
      SELECT "id", "assignee_id" FROM "tickets" WHERE "assignee_id" IS NOT NULL
    `);

    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "assignee_id"`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ticket_status_enum"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_assignee_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_status_priority_assignee"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_parent_ticket_id"`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_status_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_parent_ticket_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_status_id"`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "parent_ticket_id"`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "status_id"`);

    await queryRunner.query(`ALTER TABLE "sprints" DROP COLUMN "goal"`);

    await queryRunner.query(`DROP TABLE "ticket_assignees"`);
    await queryRunner.query(`DROP TABLE "ticket_labels"`);
    await queryRunner.query(`DROP TABLE "labels"`);
    await queryRunner.query(`DROP TABLE "statuses"`);
    await queryRunner.query(`DROP TYPE "status_category_enum"`);
  }
}
