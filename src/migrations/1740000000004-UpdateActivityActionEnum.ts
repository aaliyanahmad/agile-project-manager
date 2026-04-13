import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateActivityActionEnum1740000000004 implements MigrationInterface {
    name = 'UpdateActivityActionEnum1740000000004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the missing REMOVED_FROM_SPRINT value to the enum
        await queryRunner.query(`
            ALTER TYPE "activity_action_enum" ADD VALUE 'REMOVED_FROM_SPRINT'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing enum values
        // This migration is not reversible
    }
}