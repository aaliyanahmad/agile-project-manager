import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1786900000000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1786900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ensure critical indexes for board queries exist
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tickets_status_id" ON "tickets" ("status_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tickets_parent_ticket_id" ON "tickets" ("parent_ticket_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tickets_project_status" ON "tickets" ("project_id", "status_id")`);
        
        // Ensure join table indexes exist for efficient filtering
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ticket_labels_label_id" ON "ticket_labels" ("label_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ticket_assignees_user_id" ON "ticket_assignees" ("user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_status_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_parent_ticket_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_project_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_labels_label_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_assignees_user_id"`);
    }

}
