import { AppDataSource } from '../src/data-source';

async function migrateEnumValue() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    console.log('Running migration to add DUE_DATE_CHANGED enum value...');
    
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      await queryRunner.query(
        `ALTER TYPE "activity_action_enum" ADD VALUE 'DUE_DATE_CHANGED'`,
      );
      console.log('✅ Successfully added DUE_DATE_CHANGED to activity_action_enum');
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
