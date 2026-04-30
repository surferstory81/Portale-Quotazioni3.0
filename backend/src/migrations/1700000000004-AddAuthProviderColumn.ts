import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthProviderColumn1700000000004 implements MigrationInterface {
  name = 'AddAuthProviderColumn1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'local';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "auth_provider";
    `);
  }
}
