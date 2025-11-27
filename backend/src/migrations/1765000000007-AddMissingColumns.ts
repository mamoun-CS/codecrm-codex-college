import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumns1765000000007 implements MigrationInterface {
  name = 'AddMissingColumns1765000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to activities table
    await queryRunner.query(`
      ALTER TABLE activities
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
        ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
    `);

    // Add missing columns to leads table
    await queryRunner.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS substatus VARCHAR(255),
        ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS email_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_email_opened_at TIMESTAMP
    `);

    // Add missing columns to files table
    await queryRunner.query(`
      ALTER TABLE files
        ADD COLUMN IF NOT EXISTS file_path VARCHAR(500),
        ADD COLUMN IF NOT EXISTS original_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS file_extension VARCHAR(10)
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_completed ON activities (completed);
      CREATE INDEX IF NOT EXISTS idx_activities_priority ON activities (priority);
      CREATE INDEX IF NOT EXISTS idx_leads_email_count ON leads (email_count);
      CREATE INDEX IF NOT EXISTS idx_leads_last_email_sent ON leads (last_email_sent_at);
      CREATE INDEX IF NOT EXISTS idx_files_extension ON files (file_extension);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove added columns (in reverse order)
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_files_extension;
      DROP INDEX IF EXISTS idx_leads_last_email_sent;
      DROP INDEX IF EXISTS idx_leads_email_count;
      DROP INDEX IF EXISTS idx_activities_priority;
      DROP INDEX IF EXISTS idx_activities_completed;
    `);

    await queryRunner.query(`
      ALTER TABLE files
        DROP COLUMN IF EXISTS file_extension,
        DROP COLUMN IF EXISTS original_name,
        DROP COLUMN IF EXISTS file_path;
    `);

    await queryRunner.query(`
      ALTER TABLE leads
        DROP COLUMN IF EXISTS last_email_opened_at,
        DROP COLUMN IF EXISTS email_count,
        DROP COLUMN IF EXISTS last_email_sent_at,
        DROP COLUMN IF EXISTS substatus;
    `);

    await queryRunner.query(`
      ALTER TABLE activities
        DROP COLUMN IF EXISTS completed_at,
        DROP COLUMN IF EXISTS completed,
        DROP COLUMN IF EXISTS priority;
    `);
  }
}