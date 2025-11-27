import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADD INTEGRATION FIELDS MIGRATION
 * 
 * Adds missing fields to the integrations table that are used by the integrations service
 * but were not in the original simplified schema.
 * 
 * FIELDS ADDED:
 * - user_id: Owner of the integration
 * - type: Integration type (oauth, webhook, api, wordpress)
 * - status: Integration status (active, inactive, error, connected)
 * - page_access_token: Facebook page access token
 * - user_access_token: Facebook user access token
 * - scopes: OAuth scopes granted
 * - webhook_status: Webhook status (active, inactive)
 * - auth_token: Authentication token for API integrations
 * - updated_at: Last update timestamp
 */
export class AddIntegrationFields1700000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add user_id column
    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS user_id INTEGER
    `);

    // Add type column with enum
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_type_enum') THEN
          CREATE TYPE integration_type_enum AS ENUM ('oauth', 'webhook', 'api', 'wordpress');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS type integration_type_enum
    `);

    // Add status column with enum
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status_enum') THEN
          CREATE TYPE integration_status_enum AS ENUM ('active', 'inactive', 'error', 'connected');
        ELSE
          -- Add 'connected' to existing enum if it doesn't exist
          ALTER TYPE integration_status_enum ADD VALUE IF NOT EXISTS 'connected';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS status integration_status_enum DEFAULT 'active'
    `);

    // Add page_access_token column
    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS page_access_token VARCHAR
    `);

    // Add user_access_token column
    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS user_access_token VARCHAR
    `);

    // Add scopes column (JSONB array)
    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS scopes JSONB
    `);

    // Add webhook_status column with enum
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_status_enum') THEN
          CREATE TYPE webhook_status_enum AS ENUM ('active', 'inactive');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS webhook_status webhook_status_enum
    `);

    // Add auth_token column
    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS auth_token VARCHAR
    `);

    // Add updated_at column
    await queryRunner.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Add foreign key for user_id
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'integrations_user_id_fkey'
        ) THEN
          ALTER TABLE integrations 
          ADD CONSTRAINT integrations_user_id_fkey 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Create index on user_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_user_id 
      ON integrations (user_id)
    `);

    // Create index on status for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_status 
      ON integrations (status)
    `);

    // Create composite index for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_user_provider 
      ON integrations (user_id, provider)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_integrations_user_provider`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_integrations_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_integrations_user_id`);

    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE integrations 
      DROP CONSTRAINT IF EXISTS integrations_user_id_fkey
    `);

    // Drop columns
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS auth_token`);
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS webhook_status`);
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS scopes`);
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS user_access_token`);
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS page_access_token`);
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS type`);
    await queryRunner.query(`ALTER TABLE integrations DROP COLUMN IF EXISTS user_id`);

    // Note: We don't drop the enum types as they might be used elsewhere
  }
}

