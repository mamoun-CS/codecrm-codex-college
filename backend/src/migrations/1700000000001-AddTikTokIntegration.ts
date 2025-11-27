import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTikTokIntegration1700000000001 implements MigrationInterface {
    name = 'AddTikTokIntegration1700000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "tiktok_integrations" (
                "id" SERIAL PRIMARY KEY,
                "user_id" integer NOT NULL,
                "access_token" character varying,
                "refresh_token" character varying,
                "advertiser_ids" jsonb,
                "expires_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_tiktok_integrations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`ALTER TABLE "leads" ADD "advertiser_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "advertiser_id"`);
        await queryRunner.query(`DROP TABLE "tiktok_integrations"`);
    }

}
