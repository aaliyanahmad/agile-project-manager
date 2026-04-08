import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketSearchIndexesAndUserTheme1740000000001 implements MigrationInterface {
  name = 'AddTicketSearchIndexesAndUserTheme1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "user_theme_enum" AS ENUM('DARK', 'LIGHT')`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "theme" "user_theme_enum" NOT NULL DEFAULT 'DARK'`);

    await queryRunner.query(`CREATE INDEX "idx_ticket_title" ON "tickets" ("title")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_ticket_key" ON "tickets" ("ticket_key")`);
    await queryRunner.query(`CREATE INDEX "idx_ticket_description" ON "tickets" ("description")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_ticket_description"`);
    await queryRunner.query(`DROP INDEX "idx_ticket_ticket_key"`);
    await queryRunner.query(`DROP INDEX "idx_ticket_title"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "theme"`);
    await queryRunner.query(`DROP TYPE "user_theme_enum"`);
  }
}
