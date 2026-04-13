import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLabelCreatedAtColumn1776075165749 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "labels"
            ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT now()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "labels"
            DROP COLUMN "created_at"
        `);
    }

}
