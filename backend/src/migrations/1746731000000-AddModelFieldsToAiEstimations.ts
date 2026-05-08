import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddModelFieldsToAiEstimations1746731000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add model_id column
    await queryRunner.addColumn(
      'ai_estimations',
      new TableColumn({
        name: 'model_id',
        type: 'varchar',
        length: '100',
        isNullable: true,
        default: "'eu.anthropic.claude-sonnet-4-5-20250929-v1:0'",
      }),
    );

    // Add model_name column for display purposes
    await queryRunner.addColumn(
      'ai_estimations',
      new TableColumn({
        name: 'model_name',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'Claude Sonnet 4.5'",
      }),
    );

    // Backfill existing records with default model
    await queryRunner.query(`
      UPDATE ai_estimations
      SET model_id = 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
          model_name = 'Claude Sonnet 4.5'
      WHERE model_id IS NULL;
    `);

    // Create index for efficient queries by model
    await queryRunner.query(`
      CREATE INDEX idx_ai_estimations_model_id ON ai_estimations(model_id);
    `);

    // Create index for finding all estimations of a quotation (for comparison)
    await queryRunner.query(`
      CREATE INDEX idx_ai_estimations_quotation_created
      ON ai_estimations(quotation_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_ai_estimations_quotation_created;`);
    await queryRunner.query(`DROP INDEX idx_ai_estimations_model_id;`);
    await queryRunner.dropColumn('ai_estimations', 'model_name');
    await queryRunner.dropColumn('ai_estimations', 'model_id');
  }
}
