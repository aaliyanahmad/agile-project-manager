import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProcessedEventsTable1786902000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'processed_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'eventId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'eventType',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique index on eventId for idempotency
    await queryRunner.createIndex(
      'processed_events',
      new TableIndex({
        name: 'idx_processed_event_id',
        columnNames: ['eventId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('processed_events', 'idx_processed_event_id');
    await queryRunner.dropTable('processed_events');
  }
}
