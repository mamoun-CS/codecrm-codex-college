import { MigrationInterface, QueryRunner } from "typeorm";

export class UnifyLeadsSchema1763683608343 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Enum for unified lead source
        await queryRunner.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source_enum') THEN
                CREATE TYPE lead_source_enum AS ENUM ('manual','meta','tiktok','landing_page','wordpress','import','api');
              END IF;
            END$$;
        `);

        // 2. Prepare leads table
        await queryRunner.query(`ALTER TABLE leads RENAME COLUMN source TO legacy_source;`);

        await queryRunner.query(`
            ALTER TABLE leads
              ADD COLUMN source lead_source_enum NOT NULL DEFAULT 'manual',
              ADD COLUMN source_reference_id varchar,
              ADD COLUMN raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
              ADD COLUMN original_created_at timestamptz,
              ADD COLUMN ingested_at timestamptz NOT NULL DEFAULT now(),
              ADD COLUMN pipeline_id integer;
        `);

        await queryRunner.query(`
            ALTER TABLE leads
              ALTER COLUMN custom_fields TYPE jsonb USING COALESCE(custom_fields, '{}'::json)::jsonb;
        `);

        await queryRunner.query(`
            UPDATE leads
            SET source = CASE
                  WHEN legacy_source ILIKE 'meta%' THEN 'meta'
                  WHEN legacy_source ILIKE 'tiktok%' THEN 'tiktok'
                  WHEN legacy_source ILIKE 'landing%' THEN 'landing_page'
                  WHEN legacy_source ILIKE 'wordpress%' THEN 'wordpress'
                  WHEN legacy_source ILIKE 'import%' THEN 'import'
                  WHEN legacy_source ILIKE 'api%' THEN 'api'
                  ELSE 'manual'
                END,
                original_created_at = created_at,
                raw_payload = raw_payload || jsonb_build_object('legacy_source', legacy_source);
        `);

        await queryRunner.query(`ALTER TABLE leads DROP COLUMN legacy_source;`);

        await queryRunner.query(`
            ALTER TABLE leads
              ADD CONSTRAINT fk_leads_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL;
        `);

        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_reference ON leads (source, source_reference_id);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_source_created_at ON leads (source, created_at DESC);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_owner_created_at ON leads (owner_user_id, created_at DESC);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_team_created_at ON leads (team_id, created_at DESC);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_campaign_created_at ON leads (campaign_id, created_at DESC);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_ingested_at ON leads USING BRIN (ingested_at);`);

        // 3. Normalize landing page tracking -> lead_touchpoints
        await queryRunner.query(`ALTER TYPE landing_page_tracking_event_type_enum RENAME TO lead_touchpoint_event_type_enum;`);
        await queryRunner.query(`ALTER TABLE landing_page_tracking RENAME TO lead_touchpoints;`);

        await queryRunner.query(`
            ALTER TABLE lead_touchpoints
              ADD COLUMN lead_id integer,
              ADD COLUMN source lead_source_enum NOT NULL DEFAULT 'landing_page',
              ALTER COLUMN additional_data TYPE jsonb USING COALESCE(additional_data, '{}'::json)::jsonb,
              ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
        `);

        await queryRunner.query(`
            ALTER TABLE lead_touchpoints
              ADD CONSTRAINT fk_lead_touchpoints_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lead_touchpoints_lead_created ON lead_touchpoints (lead_id, created_at DESC);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lead_touchpoints_source_created ON lead_touchpoints (source, created_at DESC);`);

        // 4. Relax FK constraints to ON DELETE SET NULL
        await queryRunner.query(`ALTER TABLE deals ALTER COLUMN lead_id DROP NOT NULL;`);
        await queryRunner.query(`ALTER TABLE activities ALTER COLUMN lead_id DROP NOT NULL;`);
        await queryRunner.query(`ALTER TABLE messages ALTER COLUMN lead_id DROP NOT NULL;`);

        await queryRunner.query(`ALTER TABLE deals DROP CONSTRAINT IF EXISTS "FK_96b51475f76f01c135ecdc968dc";`);
        await queryRunner.query(`ALTER TABLE deals ADD CONSTRAINT fk_deals_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;`);

        await queryRunner.query(`ALTER TABLE deals DROP CONSTRAINT IF EXISTS "FK_9e8ce2b9d84c7fb97105ce7f007";`);
        await queryRunner.query(`ALTER TABLE deals ADD CONSTRAINT fk_deals_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL;`);

        await queryRunner.query(`ALTER TABLE activities DROP CONSTRAINT IF EXISTS "FK_df9eae372b2fdd0e4fb74871667";`);
        await queryRunner.query(`ALTER TABLE activities ADD CONSTRAINT fk_activities_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;`);

        await queryRunner.query(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS "FK_5cba80c8f9b3fa687a0dff75736";`);
        await queryRunner.query(`ALTER TABLE messages ADD CONSTRAINT fk_messages_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;`);

        await queryRunner.query(`ALTER TABLE campaign_activities DROP CONSTRAINT IF EXISTS "FK_26540c5867a507688349409bb62";`);
        await queryRunner.query(`ALTER TABLE campaign_activities ADD CONSTRAINT fk_campaign_activities_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;`);

        // 5. Preserve raw source tables (one-time snapshot)
        await queryRunner.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_leads_archive') THEN
                EXECUTE 'CREATE TABLE meta_leads_archive AS TABLE meta_leads WITH DATA';
              END IF;
            END$$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tiktok_leads_archive') THEN
                EXECUTE 'CREATE TABLE tiktok_leads_archive AS TABLE tiktok_leads WITH DATA';
              END IF;
            END$$;
        `);

        // 6. Merge Meta leads
        await queryRunner.query(`
            INSERT INTO leads (
                full_name,
                phone,
                email,
                country,
                campaign_id,
                status,
                owner_user_id,
                team_id,
                created_at,
                updated_at,
                ad_id,
                adset_id,
                form_id,
                lead_id,
                custom_fields,
                advertiser_id,
                source,
                source_reference_id,
                raw_payload,
                original_created_at,
                ingested_at
            )
            SELECT
                NULLIF(ml.full_name, ''),
                NULLIF(ml.phone, ''),
                NULLIF(ml.email, ''),
                NULL,
                c.id,
                'new',
                NULL,
                ml.company_id,
                ml.created_at,
                ml.created_at,
                ml.ad_id,
                ml.adset_id,
                ml.form_id,
                ml.lead_id,
                '{}'::jsonb,
                NULL,
                'meta'::lead_source_enum,
                ml.lead_id,
                COALESCE(ml.raw_data, '{}'::jsonb),
                ml.created_at,
                now()
            FROM meta_leads ml
            LEFT JOIN campaigns c ON c.platform_campaign_id = ml.campaign_id
            ON CONFLICT (source, source_reference_id)
            DO UPDATE SET
                raw_payload = COALESCE(leads.raw_payload, '{}'::jsonb) || EXCLUDED.raw_payload,
                original_created_at = LEAST(leads.original_created_at, EXCLUDED.original_created_at);
        `);

        // 7. Merge TikTok leads
        await queryRunner.query(`
            INSERT INTO leads (
                full_name,
                phone,
                email,
                country,
                campaign_id,
                status,
                owner_user_id,
                team_id,
                created_at,
                updated_at,
                ad_id,
                form_id,
                lead_id,
                custom_fields,
                advertiser_id,
                source,
                source_reference_id,
                raw_payload,
                original_created_at,
                ingested_at
            )
            SELECT
                NULLIF(tl.full_name, ''),
                NULLIF(tl.phone, ''),
                NULLIF(tl.email, ''),
                NULL,
                c.id,
                'new',
                NULL,
                tl.company_id,
                tl.created_at,
                tl.created_at,
                tl.ad_id,
                tl.form_id,
                tl.lead_id,
                '{}'::jsonb,
                tl.advertiser_id,
                'tiktok'::lead_source_enum,
                tl.lead_id,
                COALESCE(tl.raw_data, '{}'::jsonb),
                tl.created_at,
                now()
            FROM tiktok_leads tl
            LEFT JOIN campaigns c ON c.platform_campaign_id = tl.campaign_id
            ON CONFLICT (source, source_reference_id)
            DO UPDATE SET
                raw_payload = COALESCE(leads.raw_payload, '{}'::jsonb) || EXCLUDED.raw_payload,
                original_created_at = LEAST(leads.original_created_at, EXCLUDED.original_created_at);
        `);

        // 8. Attach landing/WordPress events to leads when the form_id matches
        await queryRunner.query(`
            UPDATE lead_touchpoints ltp
            SET lead_id = l.id
            FROM leads l
            WHERE ltp.lead_id IS NULL
              AND l.form_id IS NOT NULL
              AND l.form_id = COALESCE(ltp.additional_data ->> 'form_id', ltp.additional_data ->> 'formId');
        `);

        // 9. Remove redundant runtime tables (archives remain)
        await queryRunner.query(`DROP TABLE IF EXISTS meta_leads CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS tiktok_leads CASCADE;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
