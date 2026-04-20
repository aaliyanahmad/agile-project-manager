import { AppDataSource } from '../src/data-source';

async function migrateEnumValue() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    console.log('Running migration to add TICKET_REORDERED enum value...');
    
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      await queryRunner.query(
        `ALTER TYPE "activity_action_enum" ADD VALUE 'TICKET_REORDERED'`,
      );
      console.log('✅ Successfully added TICKET_REORDERED to activity_action_enum');
    } finally {
      await queryRunner.release();
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateEnumValue();
