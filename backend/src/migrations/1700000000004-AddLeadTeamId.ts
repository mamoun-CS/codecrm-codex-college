import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLeadTeamId1700000000004 implements MigrationInterface {
    name = 'AddLeadTeamId1700000000004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" ADD "team_id" integer`);
        await queryRunner.query(`
            ALTER TABLE "leads"
            ADD CONSTRAINT "FK_leads_team"
            FOREIGN KEY ("team_id") REFERENCES "teams"("id")
            ON DELETE SET NULL
        `);
        await queryRunner.query(`
            UPDATE "leads" AS l
            SET "team_id" = u.team_id
            FROM "users" AS u
            WHERE l.owner_user_id = u.id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_team"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "team_id"`);
    }
}
