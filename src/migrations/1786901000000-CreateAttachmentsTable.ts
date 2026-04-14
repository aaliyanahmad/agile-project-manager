import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateAttachmentsTable1786901000000 implements MigrationInterface {
    name = 'CreateAttachmentsTable1786901000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create attachments table if it doesn't exist
        const tableExists = await queryRunner.hasTable('attachments');
        
        if (!tableExists) {
            await queryRunner.createTable(
                new Table({
                    name: 'attachments',
                    columns: [
                        {
                            name: 'id',
                            type: 'uuid',
                            isPrimary: true,
                            generationStrategy: 'uuid',
                            default: 'uuid_generate_v4()',
                        },
                        {
                            name: 'ticket_id',
                            type: 'uuid',
                            isNullable: true,
                        },
                        {
                            name: 'comment_id',
                            type: 'uuid',
                            isNullable: true,
                        },
                        {
                            name: 'file_url',
                            type: 'text',
                            isNullable: false,
                        },
                        {
                            name: 'file_name',
                            type: 'varchar',
                            length: '255',
                            isNullable: false,
                        },
                        {
                            name: 'file_size',
                            type: 'integer',
                            isNullable: false,
                        },
                        {
                            name: 'uploaded_by',
                            type: 'uuid',
                            isNullable: false,
                        },
                        {
                            name: 'created_at',
                            type: 'timestamp',
                            default: 'now()',
                            isNullable: false,
                        },
                    ],
                }),
                true,
            );

            // Add check constraint to ensure at least one of ticket_id or comment_id is set
            await queryRunner.query(
                `ALTER TABLE "attachments" ADD CONSTRAINT "chk_attachment_has_entity" CHECK (("ticket_id" IS NOT NULL OR "comment_id" IS NOT NULL))`,
            );

            // Add foreign key constraints
            await queryRunner.createForeignKey(
                'attachments',
                new TableForeignKey({
                    columnNames: ['ticket_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'tickets',
                    onDelete: 'CASCADE',
                }),
            );

            await queryRunner.createForeignKey(
                'attachments',
                new TableForeignKey({
                    columnNames: ['comment_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'comments',
                    onDelete: 'CASCADE',
                }),
            );

            await queryRunner.createForeignKey(
                'attachments',
                new TableForeignKey({
                    columnNames: ['uploaded_by'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'users',
                    onDelete: 'RESTRICT',
                }),
            );
        }

        // Add indexes for better query performance (if they don't exist)
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_attachment_ticket_id" ON "attachments" ("ticket_id")`,
        );

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_attachment_comment_id" ON "attachments" ("comment_id")`,
        );

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_attachment_uploaded_by" ON "attachments" ("uploaded_by")`,
        );

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_attachment_created_at" ON "attachments" ("created_at")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('attachments', 'idx_attachment_created_at');
        await queryRunner.dropIndex('attachments', 'idx_attachment_uploaded_by');
        await queryRunner.dropIndex('attachments', 'idx_attachment_comment_id');
        await queryRunner.dropIndex('attachments', 'idx_attachment_ticket_id');

        // Drop foreign keys and table
        await queryRunner.dropTable('attachments');
    }

}
