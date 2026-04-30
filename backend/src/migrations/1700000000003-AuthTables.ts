import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthTables1700000000003 implements MigrationInterface {
  name = 'AuthTables1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
        "id"         UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "token"      VARCHAR(255) NOT NULL UNIQUE,
        "user_id"    UUID         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires_at" TIMESTAMP    NOT NULL,
        "is_used"    BOOLEAN      NOT NULL DEFAULT false,
        "created_at" TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id"         UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "token"      VARCHAR(255) NOT NULL UNIQUE,
        "user_id"    UUID         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires_at" TIMESTAMP    NOT NULL,
        "is_used"    BOOLEAN      NOT NULL DEFAULT false,
        "created_at" TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id"         UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "token"      VARCHAR(500) NOT NULL,
        "user_id"    UUID         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires_at" TIMESTAMP    NOT NULL,
        "is_revoked" BOOLEAN      NOT NULL DEFAULT false,
        "created_at" TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_email_verification_tokens_token" ON "email_verification_tokens" ("token");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" ("token");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_verification_tokens"`);
  }
}
