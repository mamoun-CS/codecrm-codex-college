import { MigrationInterface, QueryRunner } from 'typeorm';

type LeadArchiveOptions = {
  table: string;
  leadSourceLiteral: string;
  platformLiteral: string;
  sourceReferencePath: string;
};

export class ConsolidateUnifiedData1765000000006 implements MigrationInterface {
  name = 'ConsolidateUnifiedData1765000000006';

  private readonly leadMigrationTag = 'archival_merge_2024';
  private readonly integrationMigrationTag = 'integration_merge_2024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      await this.ensureLeadPlatformEnum(queryRunner);
      await this.ensureIntegrationEnums(queryRunner);
      await this.addLeadColumns(queryRunner);
      await this.addCampaignColumns(queryRunner);

      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_leads_platform_source_status ON leads (platform_source, status)`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON leads (archived_at) WHERE archived_at IS NOT NULL`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_integrations_platform_user ON integrations (platform_type, user_id)`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations (status)`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_campaigns_platform_type_status ON campaigns (platform_type, status)`
      );

      const archivedSources: LeadArchiveOptions[] = [
        {
          table: 'meta_leads_archive',
          leadSourceLiteral: `'meta'::lead_source_enum`,
          platformLiteral: `'meta'::lead_platform_source_enum`,
          sourceReferencePath: `NULLIF(sd.payload->>'lead_id','')`,
        },
        {
          table: 'tiktok_leads_archive',
          leadSourceLiteral: `'tiktok'::lead_source_enum`,
          platformLiteral: `'tiktok'::lead_platform_source_enum`,
          sourceReferencePath: `NULLIF(sd.payload->>'lead_id','')`,
        },
      ];

      for (const archive of archivedSources) {
        if (await this.tableExists(queryRunner, archive.table)) {
          const merged = await this.mergeArchivedLeads(queryRunner, archive);
        }
      }

      if (await this.tableExists(queryRunner, 'tiktok_integrations')) {
        const upserts = await this.mergeTikTokIntegrations(queryRunner);
      }

      if (await this.tableExists(queryRunner, 'integration_connections')) {
        const webhookUpserts = await this.mergeIntegrationConnections(queryRunner);
      }

      await this.assertZero(
        queryRunner,
        `SELECT COUNT(*)::int AS total FROM leads WHERE platform_source IS NULL`,
        'Some leads are missing platform_source after consolidation'
      );
      await this.assertZero(
        queryRunner,
        `SELECT COUNT(*)::int AS total FROM integrations WHERE platform_type IS NULL`,
        'Some integrations are missing platform_type after consolidation'
      );
      await this.assertZero(
        queryRunner,
        `SELECT COUNT(*)::int AS total FROM leads WHERE archived_at IS NOT NULL AND archive_reason IS NULL`,
        'Archived leads without archive_reason detected'
      );

      await this.assertZero(
        queryRunner,
        `
          SELECT COUNT(*)::int AS total
          FROM (
            SELECT source, source_reference_id, COUNT(*) AS c
            FROM leads
            WHERE source_reference_id IS NOT NULL
            GROUP BY source, source_reference_id
            HAVING COUNT(*) > 1
          ) dup
        `,
        'Duplicate (source, source_reference_id) pairs detected after merge'
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      const revertedLeads = await queryRunner.query(
        `
          WITH removed AS (
            DELETE FROM leads
            WHERE raw_payload::jsonb ->> 'migration_tag' = $1
            RETURNING 1
          )
          SELECT COUNT(*)::int AS total FROM removed;
        `,
        [this.leadMigrationTag]
      );

      const revertedIntegrations = await queryRunner.query(
        `
          WITH removed AS (
            DELETE FROM integrations
            WHERE (metadata::jsonb) ->> 'migration_tag' = $1
            RETURNING 1
          )
          SELECT COUNT(*)::int AS total FROM removed;
        `,
        [this.integrationMigrationTag]
      );

      await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_platform_source_status`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_archived_at`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_integrations_platform_user`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_integrations_status`);
      await queryRunner.query(`DROP INDEX IF EXISTS idx_campaigns_platform_type_status`);

      await queryRunner.query(`ALTER TABLE leads DROP COLUMN IF EXISTS archive_reason`);
      await queryRunner.query(`ALTER TABLE leads DROP COLUMN IF EXISTS archived_at`);
      await queryRunner.query(`ALTER TABLE leads DROP COLUMN IF EXISTS platform_source`);
      await queryRunner.query(`ALTER TABLE campaigns DROP COLUMN IF EXISTS platform_campaign_data`);
      await queryRunner.query(`ALTER TABLE campaigns DROP COLUMN IF EXISTS platform_type`);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  private async ensureLeadPlatformEnum(queryRunner: QueryRunner) {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_platform_source_enum') THEN
          CREATE TYPE lead_platform_source_enum AS ENUM ('meta','tiktok','google','manual','website');
        END IF;
      END$$;
    `);
  }

  private async ensureIntegrationEnums(queryRunner: QueryRunner) {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_platform_type_enum') THEN
          CREATE TYPE integration_platform_type_enum AS ENUM ('meta','tiktok','google','whatsapp','wordpress');
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status_enum') THEN
          CREATE TYPE integration_status_enum AS ENUM ('active','inactive','error','testing','connected','disconnected');
        END IF;
      END$$;
    `);
  }

  private async addLeadColumns(queryRunner: QueryRunner) {
    await queryRunner.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS platform_source lead_platform_source_enum NOT NULL DEFAULT 'manual'
    `);
    await queryRunner.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS archived_at timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS archive_reason text
    `);
    await queryRunner.query(`
      ALTER TABLE leads
        ALTER COLUMN raw_payload TYPE jsonb USING COALESCE(raw_payload, '{}'::jsonb)
    `);
  }

  private async addCampaignColumns(queryRunner: QueryRunner) {
    await queryRunner.query(`
      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS platform_type integration_platform_type_enum
    `);
    await queryRunner.query(`
      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS platform_campaign_data jsonb
    `);
  }

  private async mergeArchivedLeads(
    queryRunner: QueryRunner,
    options: LeadArchiveOptions
  ): Promise<number> {
    const result = await queryRunner.query(
      `
        WITH source_data AS (
          SELECT to_jsonb(src) AS payload FROM ${options.table} src
        ),
        upsert AS (
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
            ingested_at,
            platform_source,
            archived_at,
            archive_reason
          )
          SELECT
            NULLIF(sd.payload->>'full_name', ''),
            NULLIF(sd.payload->>'phone', ''),
            NULLIF(sd.payload->>'email', ''),
            NULLIF(sd.payload->>'country', ''),
            c.id,
            COALESCE(NULLIF(sd.payload->>'status', ''), 'new'),
            NULL,
            NULL,
            COALESCE((sd.payload->>'created_at')::timestamptz, now()),
            COALESCE((sd.payload->>'updated_at')::timestamptz, (sd.payload->>'created_at')::timestamptz, now()),
            NULLIF(sd.payload->>'ad_id', ''),
            NULLIF(sd.payload->>'adset_id', ''),
            NULLIF(sd.payload->>'form_id', ''),
            NULLIF(sd.payload->>'lead_id', ''),
            COALESCE(sd.payload->'custom_fields', '{}'::jsonb),
            NULLIF(sd.payload->>'advertiser_id', ''),
            ${options.leadSourceLiteral},
            ${options.sourceReferencePath},
            sd.payload || jsonb_build_object(
              'migration_tag', $1,
              'source_table', $2
            ),
            COALESCE((sd.payload->>'created_at')::timestamptz, now()),
            now(),
            ${options.platformLiteral},
            CASE WHEN sd.payload ? 'archived_at' THEN (sd.payload->>'archived_at')::timestamptz ELSE NULL END,
            CASE WHEN sd.payload ? 'archived_at' THEN COALESCE(NULLIF(sd.payload->>'archive_reason', ''), 'migrated from archive') ELSE NULL END
          FROM source_data sd
          LEFT JOIN campaigns c ON c.platform_campaign_id = NULLIF(sd.payload->>'campaign_id', '')
          ON CONFLICT (source, source_reference_id)
          DO UPDATE SET
            raw_payload = COALESCE(leads.raw_payload, '{}'::jsonb) || EXCLUDED.raw_payload,
            platform_source = EXCLUDED.platform_source,
            archived_at = COALESCE(leads.archived_at, EXCLUDED.archived_at),
            archive_reason = COALESCE(leads.archive_reason, EXCLUDED.archive_reason),
            custom_fields = COALESCE(leads.custom_fields, '{}'::jsonb) || EXCLUDED.custom_fields
          RETURNING 1
        )
        SELECT COUNT(*)::int AS total FROM upsert;
      `,
      [this.leadMigrationTag, options.table]
    );
    return Number(result?.[0]?.total ?? 0);
  }

  private async mergeTikTokIntegrations(queryRunner: QueryRunner): Promise<number> {
    const result = await queryRunner.query(
      `
        WITH inserted AS (
          INSERT INTO integrations (
            name,
            type,
            provider,
            platform_type,
            status,
            user_id,
            connection_config,
            advertiser_ids,
            access_token,
            refresh_token,
            expires_at,
            created_at,
            updated_at,
            metadata
          )
          SELECT
            COALESCE(ti.client_id, 'Unknown TikTok Client'),
            'oauth',
            'tiktok',
            'tiktok'::integration_platform_type_enum,
            'connected'::integration_status_enum,
            ti.user_id,
            jsonb_build_object(
              'client_id', ti.client_id,
              'client_secret', ti.client_secret
            ),
            COALESCE(ti.advertiser_ids, '[]'::jsonb),
            ti.access_token,
            ti.refresh_token,
            ti.expires_at,
            ti.created_at,
            ti.updated_at,
            jsonb_build_object('migration_tag', $1, 'source_table', 'tiktok_integrations')
          FROM tiktok_integrations ti
          LEFT JOIN integrations i
            ON i.platform_type = 'tiktok'::integration_platform_type_enum
           AND i.user_id = ti.user_id
           AND (i.account_id = ti.account_id OR i.account_id IS NULL)
          WHERE i.id IS NULL
          RETURNING 1
        )
        SELECT COUNT(*)::int AS total FROM inserted;
      `,
      [this.integrationMigrationTag]
    );

    await queryRunner.query(
      `
        UPDATE integrations i
        SET
          platform_type = 'tiktok'::integration_platform_type_enum,
          provider = 'tiktok',
          type = COALESCE(i.type, 'oauth'),
          status = CASE
            WHEN i.status IS NULL OR i.status::text = '' THEN 'active'::integration_status_enum
            ELSE i.status
          END,
          connection_config = COALESCE(i.connection_config, '{}'::jsonb) || jsonb_build_object(
            'client_id', ti.client_id,
            'client_secret', ti.client_secret
          ),
          advertiser_ids = COALESCE(i.advertiser_ids, '[]'::jsonb) || COALESCE(ti.advertiser_ids, '[]'::jsonb),
          metadata = COALESCE(i.metadata::jsonb, '{}'::jsonb) || jsonb_build_object('migration_tag', $1, 'source_table', 'tiktok_integrations')
        FROM tiktok_integrations ti
        WHERE i.user_id = ti.user_id
          AND (i.provider = 'tiktok' OR i.platform_type = 'tiktok'::integration_platform_type_enum OR i.platform_type IS NULL);
      `,
      [this.integrationMigrationTag]
    );

    return Number(result?.[0]?.total ?? 0);
  }

  private async mergeIntegrationConnections(queryRunner: QueryRunner): Promise<number> {
    const result = await queryRunner.query(
      `
        WITH inserted AS (
          INSERT INTO integrations (
            name,
            type,
            provider,
            platform_type,
            status,
            user_id,
            connection_config,
            created_at,
            updated_at,
            metadata
          )
          SELECT
            ic.name,
            'webhook',
            ic.platform,
            CASE ic.platform
              WHEN 'facebook' THEN 'meta'
              WHEN 'meta' THEN 'meta'
              WHEN 'google' THEN 'google'
              WHEN 'tiktok' THEN 'tiktok'
              ELSE 'wordpress'
            END::integration_platform_type_enum,
            CASE ic.status
              WHEN 'inactive' THEN 'inactive'
              WHEN 'error' THEN 'error'
              ELSE 'active'
            END::integration_status_enum,
            NULL,
            jsonb_build_object(
              'unique_id', ic.unique_id,
              'description', ic.description
            ),
            now(),
            now(),
            jsonb_build_object('migration_tag', $1, 'source_table', 'integration_connections')
          FROM integration_connections ic
          LEFT JOIN integrations i ON i.connection_config ->> 'unique_id' = ic.unique_id
          WHERE i.id IS NULL
          RETURNING 1
        )
        SELECT COUNT(*)::int AS total FROM inserted;
      `,
      [this.integrationMigrationTag]
    );
    return Number(result?.[0]?.total ?? 0);
  }

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const result = await queryRunner.query(`SELECT to_regclass($1) AS oid`, [tableName]);
    return Boolean(result?.[0]?.oid);
  }

  private async assertZero(queryRunner: QueryRunner, sql: string, message: string) {
    const result = await queryRunner.query(sql);
    const total = Number(result?.[0]?.total ?? 0);
    if (total > 0) {
      throw new Error(`${message} (count=${total})`);
    }
  }
}
