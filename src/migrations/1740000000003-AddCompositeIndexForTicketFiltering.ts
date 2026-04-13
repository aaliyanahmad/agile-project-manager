import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompositeIndexForTicketFiltering1740000000003 implements MigrationInterface {
    name = 'AddCompositeIndexForTicketFiltering1740000000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "idx_ticket_project_status_priority" ON "tickets" ("project_id", "status_id", "priority")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_ticket_project_status_priority"`);
    }
}