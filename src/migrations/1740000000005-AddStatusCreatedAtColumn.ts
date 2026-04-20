import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusCreatedAtColumn1740000000005 implements MigrationInterface {
  name = 'AddStatusCreatedAtColumn1740000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "statuses" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "statuses" DROP COLUMN IF EXISTS "created_at"`);
  }
}
