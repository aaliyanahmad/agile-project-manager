import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectDescription1776246350719 implements MigrationInterface {
  name = 'AddProjectDescription1776246350719'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add column as nullable first (safe for existing data)
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "description" text
    `);

    // Step 2 (optional but recommended): set default value for existing rows
    await queryRunner.query(`
      UPDATE "projects"
      SET "description" = ''
      WHERE "description" IS NULL
    `);

    // Step 3: Make it NOT NULL
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "description" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN "description"
    `);
  }
}