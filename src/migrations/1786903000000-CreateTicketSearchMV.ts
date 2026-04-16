import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketSearchMV1786903000000 implements MigrationInterface {
  name = 'CreateTicketSearchMV1786903000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create materialized view for ticket search
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW ticket_search_mv AS
      SELECT
        t.id AS ticket_id,
        t.project_id,
        t.status_id,
        t.priority,
        t.title,
        t.description,
        jsonb_build_object(
          'id', creator.id,
          'name', creator.name
        ) AS creator,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', assignee.id,
              'name', assignee.name
            )
          ) FILTER (WHERE assignee.id IS NOT NULL),
          '[]'
        ) AS assignees,
        (
          setweight(to_tsvector('english', coalesce(t.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(t.description, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(creator.name, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(string_agg(DISTINCT assignee.name, ' '), '')), 'C')
        ) AS search_vector
      FROM tickets t
      LEFT JOIN users creator ON creator.id = t.created_by
      LEFT JOIN ticket_assignees ta ON ta.ticket_id = t.id
      LEFT JOIN users assignee ON assignee.id = ta.user_id
      GROUP BY t.id, creator.id
    `);

    // Create GIN index on search_vector for full-text search optimization
    await queryRunner.query(`
      CREATE INDEX idx_ticket_search_mv_search
      ON ticket_search_mv USING GIN(search_vector)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first (required before dropping view)
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_ticket_search_mv_search
    `);

    // Drop materialized view
    await queryRunner.query(`
      DROP MATERIALIZED VIEW IF EXISTS ticket_search_mv
    `);
  }
}
