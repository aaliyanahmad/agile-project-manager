import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketSearchMVIndex1786903000001 implements MigrationInterface {
  name = 'AddTicketSearchMVIndex1786903000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create GIN index on materialized view for full-text search optimization
    // Using IF NOT EXISTS to ensure idempotent behavior
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_search_mv_search
      ON ticket_search_mv USING GIN(search_vector)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Safely drop the index if it exists
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_ticket_search_mv_search
    `);
  }
}
