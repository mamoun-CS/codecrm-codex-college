import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialCrmSchema1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================================
    // 1) ENUM TYPES
    // =====================================
    await queryRunner.query(`
      CREATE TYPE lead_source_enum AS ENUM (
        'manual', 'meta', 'tiktok', 'google_ads', 'landing_page', 'wordpress', 'api'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE leads_status_enum AS ENUM (
        'new', 'in_progress', 'follow_up', 'not_answering', 'closed', 'won', 'lost'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE activity_type_enum AS ENUM ('call', 'message', 'meeting', 'note');
    `);

    await queryRunner.query(`
      CREATE TYPE messages_channel_enum AS ENUM ('whatsapp', 'sms', 'email', 'call');
    `);

    await queryRunner.query(`
      CREATE TYPE messages_direction_enum AS ENUM ('incoming', 'outgoing');
    `);

    await queryRunner.query(`
      CREATE TYPE files_type_enum AS ENUM ('image', 'document', 'other');
    `);

    await queryRunner.query(`
      CREATE TYPE meetings_status_enum AS ENUM ('scheduled', 'done', 'cancelled');
    `);

    await queryRunner.query(`
      CREATE TYPE price_offer_status_enum AS ENUM ('pending', 'accepted', 'rejected');
    `);

    await queryRunner.query(`
      CREATE TYPE integration_provider_enum AS ENUM ('meta', 'tiktok', 'wordpress', 'google_ads', 'custom');
    `);

    // =====================================
    // 2) TEAMS + USERS
    // =====================================
    await queryRunner.query(`
      CREATE TABLE teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description VARCHAR,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR NOT NULL UNIQUE,
        password_hash VARCHAR NOT NULL,
        role VARCHAR NOT NULL DEFAULT 'sales',
        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // =====================================
    // 3) AD SOURCES + CAMPAIGNS
    // =====================================
    await queryRunner.query(`
      CREATE TABLE ad_sources (
        id SERIAL PRIMARY KEY,
        channel VARCHAR NOT NULL,
        account_id VARCHAR NOT NULL,
        name VARCHAR NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description VARCHAR,
        country VARCHAR,
        ad_source_id INTEGER REFERENCES ad_sources(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        platform_campaign_id VARCHAR,
        active BOOLEAN DEFAULT TRUE,
        budget NUMERIC(10,2) DEFAULT 0,
        cost_per_lead NUMERIC(10,2) DEFAULT 0,
        lead_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // =====================================
    // 4) LEADS
    // =====================================
    await queryRunner.query(`
      CREATE TABLE leads (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR NOT NULL,
        phone VARCHAR,
        email VARCHAR,
        country VARCHAR,
        city VARCHAR,
        language VARCHAR,
        status leads_status_enum DEFAULT 'new',
        source lead_source_enum DEFAULT 'manual',

        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,

        utm_source VARCHAR,
        utm_medium VARCHAR,
        utm_campaign VARCHAR,
        utm_term VARCHAR,
        utm_content VARCHAR,

        external_lead_id VARCHAR,
        source_reference_id VARCHAR,
        advertiser_id VARCHAR,

        custom_fields JSONB DEFAULT '{}'::jsonb,
        raw_payload JSONB DEFAULT '{}'::jsonb,

        original_created_at TIMESTAMPTZ,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);

    // Indexes for leads
    await queryRunner.query(`
      CREATE INDEX idx_leads_status ON leads(status);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_leads_owner ON leads(owner_user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_leads_assigned ON leads(assigned_to);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_leads_campaign ON leads(campaign_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_leads_created_at ON leads(created_at);
    `);

    // =====================================
    // 5) LEAD NOTES
    // =====================================
    await queryRunner.query(`
      CREATE TABLE lead_notes (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id);
    `);

    // =====================================
    // 6) ACTIVITIES
    // =====================================
    await queryRunner.query(`
      CREATE TABLE activities (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type activity_type_enum NOT NULL,
        content TEXT,
        due_at TIMESTAMP,
        done_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_activities_lead ON activities(lead_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_activities_due_at ON activities(due_at);
    `);

    // =====================================
    // 7) MESSAGES
    // =====================================
    await queryRunner.query(`
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
        channel messages_channel_enum NOT NULL,
        direction messages_direction_enum NOT NULL,
        body TEXT NOT NULL,
        external_id VARCHAR,
        timestamp TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_messages_lead ON messages(lead_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_messages_timestamp ON messages(timestamp);
    `);

    // =====================================
    // 8) FILES
    // =====================================
    await queryRunner.query(`
      CREATE TABLE files (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR NOT NULL,
        url VARCHAR NOT NULL,
        size VARCHAR,
        mime_type VARCHAR,
        type files_type_enum DEFAULT 'other',
        uploaded_at TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_files_lead ON files(lead_id);
    `);

    // =====================================
    // 9) PIPELINES + STAGES + DEALS
    // =====================================
    await queryRunner.query(`
      CREATE TABLE pipelines (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE stages (
        id SERIAL PRIMARY KEY,
        pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        "order" INTEGER NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE deals (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
        pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL,
        stage_id INTEGER REFERENCES stages(id) ON DELETE SET NULL,
        amount NUMERIC(10,2),
        currency VARCHAR,
        expected_close_date DATE,
        won BOOLEAN DEFAULT FALSE,
        lost_reason VARCHAR
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_deals_lead ON deals(lead_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_deals_pipeline_stage ON deals(pipeline_id, stage_id);
    `);

    // =====================================
    // 10) MEETINGS
    // =====================================
    await queryRunner.query(`
      CREATE TABLE meetings (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        title VARCHAR NOT NULL,
        date TIMESTAMP NOT NULL,
        duration INTEGER DEFAULT 30,
        location VARCHAR,
        participants TEXT,
        notes TEXT,
        status meetings_status_enum DEFAULT 'scheduled',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_meetings_lead ON meetings(lead_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_meetings_date ON meetings(date);
    `);

    // =====================================
    // 11) PRICE OFFERS
    // =====================================
    await queryRunner.query(`
      CREATE TABLE price_offers (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        title VARCHAR NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        currency VARCHAR DEFAULT 'USD',
        description TEXT,
        valid_until DATE,
        status price_offer_status_enum DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_price_offers_lead ON price_offers(lead_id);
    `);

    // =====================================
    // 12) INTEGRATIONS
    // =====================================
    await queryRunner.query(`
      CREATE TABLE integrations (
        id SERIAL PRIMARY KEY,
        provider integration_provider_enum NOT NULL,
        name VARCHAR,
        slug VARCHAR UNIQUE,
        access_token VARCHAR,
        refresh_token VARCHAR,
        expires_at TIMESTAMP,
        page_id VARCHAR,
        page_name VARCHAR,
        account_id VARCHAR,
        webhook_url VARCHAR,
        webhook_config JSONB,
        extra JSONB,
        connected_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_integrations_provider ON integrations(provider);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order

    // 12) INTEGRATIONS
    await queryRunner.query(`DROP TABLE IF EXISTS integrations;`);

    // 11) PRICE OFFERS
    await queryRunner.query(`DROP TABLE IF EXISTS price_offers;`);

    // 10) MEETINGS
    await queryRunner.query(`DROP TABLE IF EXISTS meetings;`);

    // 9) DEALS + STAGES + PIPELINES
    await queryRunner.query(`DROP TABLE IF EXISTS deals;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stages;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pipelines;`);

    // 8) FILES
    await queryRunner.query(`DROP TABLE IF EXISTS files;`);

    // 7) MESSAGES
    await queryRunner.query(`DROP TABLE IF EXISTS messages;`);

    // 6) ACTIVITIES
    await queryRunner.query(`DROP TABLE IF EXISTS activities;`);

    // 5) LEAD NOTES
    await queryRunner.query(`DROP TABLE IF EXISTS lead_notes;`);

    // 4) LEADS
    await queryRunner.query(`DROP TABLE IF EXISTS leads;`);

    // 3) CAMPAIGNS + AD SOURCES
    await queryRunner.query(`DROP TABLE IF EXISTS campaigns;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ad_sources;`);

    // 2) USERS + TEAMS
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
    await queryRunner.query(`DROP TABLE IF EXISTS teams;`);

    // 1) ENUM TYPES (drop after tables)
    await queryRunner.query(`DROP TYPE IF EXISTS integration_provider_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS price_offer_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS meetings_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS files_type_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS messages_direction_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS messages_channel_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS activity_type_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS leads_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS lead_source_enum;`);
  }
}
