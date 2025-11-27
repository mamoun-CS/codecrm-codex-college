import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLeadSchemaGaps1700000000006 implements MigrationInterface {
  name = 'FixLeadSchemaGaps1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source_enum') THEN
          CREATE TYPE lead_source_enum AS ENUM ('manual','meta','tiktok','landing_page','wordpress','import','api');
        END IF;
      END$$;
    `);

    await queryRunner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source lead_source_enum DEFAULT 'manual'`);
    await queryRunner.query(`ALTER TABLE leads ALTER COLUMN source SET DEFAULT 'manual'`);

    await queryRunner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_reference_id varchar`);
    await queryRunner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_payload jsonb`);
    await queryRunner.query(`UPDATE leads SET raw_payload = '{}'::jsonb WHERE raw_payload IS NULL`);
    await queryRunner.query(`ALTER TABLE leads ALTER COLUMN raw_payload SET DEFAULT '{}'::jsonb`);
    await queryRunner.query(`ALTER TABLE leads ALTER COLUMN raw_payload SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS original_created_at timestamptz`);
    await queryRunner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ingested_at timestamptz DEFAULT now()`);
    await queryRunner.query(`UPDATE leads SET ingested_at = now() WHERE ingested_at IS NULL`);
    await queryRunner.query(`ALTER TABLE leads ALTER COLUMN ingested_at SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_id integer`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_leads_pipeline'
            AND table_name = 'leads'
        ) THEN
          ALTER TABLE leads
            ADD CONSTRAINT fk_leads_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_reference ON leads (source, source_reference_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_source_created_at ON leads (source, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_owner_created_at ON leads (owner_user_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_team_created_at ON leads (team_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_campaign_created_at ON leads (campaign_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_ingested_at ON leads USING BRIN (ingested_at)`);
  }

  public async down(): Promise<void> {
    // Irreversible safety migration – intentionally left blank.
  }
}
