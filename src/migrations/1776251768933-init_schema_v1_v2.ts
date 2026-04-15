import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAiUserStoryToTickets1776251768933 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "tickets",
            new TableColumn({
                name: "ai_user_story",
                type: "text",
                isNullable: true,           // Recommended: allow null initially
                default: null,
            })
        );

        // Optional: Add comment for better documentation
        await queryRunner.query(`
            COMMENT ON COLUMN tickets.ai_user_story IS 'AI-generated user story or detailed description of the ticket'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("tickets", "ai_user_story");
    }
}