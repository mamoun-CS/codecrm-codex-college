import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebsiteLeadIndexes1700000000002 implements MigrationInterface {
  name = 'AddWebsiteLeadIndexes1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_leads_website_email_recent ON leads (website_id, email, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_leads_website_phone_recent ON leads (website_id, phone, created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_website_phone_recent`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_website_email_recent`);
  }
}
