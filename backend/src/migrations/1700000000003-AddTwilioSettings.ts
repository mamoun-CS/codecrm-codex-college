import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTwilioSettings1700000000003 implements MigrationInterface {
    name = 'AddTwilioSettings1700000000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "twilio_settings" (
                "id" SERIAL PRIMARY KEY,
                "user_id" integer NOT NULL,
                "account_sid" character varying NOT NULL,
                "auth_token" character varying NOT NULL,
                "phone_number" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_twilio_settings_user" UNIQUE ("user_id"),
                CONSTRAINT "FK_twilio_settings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "twilio_settings"`);
    }
}
