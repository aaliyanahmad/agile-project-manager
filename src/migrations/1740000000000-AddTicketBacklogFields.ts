import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketBacklogFields1740000000000 implements MigrationInterface {
  name = 'AddTicketBacklogFields1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN "position" numeric`);
    await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN "due_date" TIMESTAMP`);

    await queryRunner.query(`CREATE INDEX "idx_ticket_position" ON "tickets" ("position")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_due_date" ON "tickets" ("due_date")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_status" ON "tickets" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_priority" ON "tickets" ("priority")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_status_priority_assignee" ON "tickets" ("status", "priority", "assignee_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_ticket_status_priority_assignee"`);
    await queryRunner.query(`DROP INDEX "idx_ticket_priority"`);
    await queryRunner.query(`DROP INDEX "idx_ticket_status"`);
    await queryRunner.query(`DROP INDEX "idx_ticket_due_date"`);
    await queryRunner.query(`DROP INDEX "idx_ticket_position"`);

    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "due_date"`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "position"`);
  }
}
