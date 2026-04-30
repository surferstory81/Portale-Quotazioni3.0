import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppSettings1700000000007 implements MigrationInterface {
  name = 'AppSettings1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "key"        VARCHAR(100) NOT NULL,
        "value"      TEXT         NOT NULL,
        "updated_at" TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_settings" PRIMARY KEY ("key")
      )
    `);

    // Seed initial values from env vars (or defaults)
    const emailEnabled = process.env.EMAIL_ENABLED === 'true' ? 'true' : 'false';
    const ssoEnabled   = process.env.SSO_ENABLED   === 'true' ? 'true' : 'false';

    await queryRunner.query(`
      INSERT INTO "app_settings" ("key", "value")
      VALUES
        ('email_enabled', $1),
        ('sso_enabled',   $2)
      ON CONFLICT ("key") DO NOTHING
    `, [emailEnabled, ssoEnabled]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_settings"`);
  }
}
