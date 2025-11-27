import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLeadStatusEnum1732320000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update existing data to use new enum values
    await queryRunner.query(`
      UPDATE leads 
      SET status = CASE 
        WHEN status = 'contacted' THEN 'in_progress'
        WHEN status = 'qualified' THEN 'follow_up'
        WHEN status = 'proposal' THEN 'follow_up'
        WHEN status = 'negotiation' THEN 'in_progress'
        WHEN status = 'archived' THEN 'closed'
        ELSE status
      END
      WHERE status IN ('contacted', 'qualified', 'proposal', 'negotiation', 'archived');
    `);

    // Step 2: Create new enum type with updated values
    await queryRunner.query(`
      CREATE TYPE leads_status_enum_new AS ENUM (
        'new', 
        'in_progress', 
        'follow_up', 
        'not_answering', 
        'closed', 
        'won', 
        'lost'
      );
    `);

    // Step 3: Alter the column to use the new enum type
    await queryRunner.query(`
      ALTER TABLE leads 
      ALTER COLUMN status TYPE leads_status_enum_new 
      USING status::text::leads_status_enum_new;
    `);

    // Step 4: Drop the old enum type
    await queryRunner.query(`DROP TYPE leads_status_enum;`);

    // Step 5: Rename the new enum type to the original name
    await queryRunner.query(`ALTER TYPE leads_status_enum_new RENAME TO leads_status_enum;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update data back to old enum values
    await queryRunner.query(`
      UPDATE leads 
      SET status = CASE 
        WHEN status = 'in_progress' THEN 'contacted'
        WHEN status = 'follow_up' THEN 'qualified'
        WHEN status = 'not_answering' THEN 'contacted'
        WHEN status = 'closed' THEN 'archived'
        ELSE status
      END
      WHERE status IN ('in_progress', 'follow_up', 'not_answering', 'closed');
    `);

    // Step 2: Create old enum type
    await queryRunner.query(`
      CREATE TYPE leads_status_enum_old AS ENUM (
        'new', 
        'contacted', 
        'qualified', 
        'proposal', 
        'negotiation', 
        'won', 
        'lost', 
        'archived'
      );
    `);

    // Step 3: Alter the column to use the old enum type
    await queryRunner.query(`
      ALTER TABLE leads 
      ALTER COLUMN status TYPE leads_status_enum_old 
      USING status::text::leads_status_enum_old;
    `);

    // Step 4: Drop the new enum type
    await queryRunner.query(`DROP TYPE leads_status_enum;`);

    // Step 5: Rename the old enum type back
    await queryRunner.query(`ALTER TYPE leads_status_enum_old RENAME TO leads_status_enum;`);
  }
}

