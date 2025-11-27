import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateAdSpendTable1732310000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ad_spend table
    await queryRunner.createTable(
      new Table({
        name: 'ad_spend',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'campaign_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'spend',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'USD'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign key to campaigns table
    await queryRunner.createForeignKey(
      'ad_spend',
      new TableForeignKey({
        columnNames: ['campaign_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'campaigns',
        onDelete: 'CASCADE',
      }),
    );

    // Create index for better query performance
    await queryRunner.query(
      `CREATE INDEX "idx_ad_spend_campaign_date" ON "ad_spend" ("campaign_id", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table (foreign keys will be dropped automatically)
    await queryRunner.dropTable('ad_spend');
  }
}

