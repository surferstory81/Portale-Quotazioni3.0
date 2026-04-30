import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id"          SERIAL PRIMARY KEY,
        "name"        VARCHAR(50)  NOT NULL UNIQUE,
        "description" VARCHAR(255),
        "created_at"  TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "matricola"     VARCHAR(50)  NOT NULL UNIQUE,
        "email"         VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "is_verified"   BOOLEAN      NOT NULL DEFAULT false,
        "role_id"       INT          REFERENCES "roles"("id"),
        "created_at"    TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quotations" (
        "id"           UUID           NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "title"        VARCHAR(100)   NOT NULL,
        "description"  TEXT,
        "status"       VARCHAR(30)    NOT NULL DEFAULT 'DRAFT',
        "totalAmount"  DECIMAL(12,2)  NOT NULL DEFAULT 0,
        "created_by"   UUID           REFERENCES "users"("id"),
        "created_at"   TIMESTAMP      NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP      NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quotation_details" (
        "id"               UUID           NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "quotation_id"     UUID           REFERENCES "quotations"("id") ON DELETE CASCADE,
        "itemDescription"  VARCHAR(255)   NOT NULL,
        "quantity"         INT            NOT NULL DEFAULT 1,
        "unitPrice"        DECIMAL(12,2)  NOT NULL,
        "totalPrice"       DECIMAL(12,2)  NOT NULL DEFAULT 0,
        "notes"            TEXT
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "logs" (
        "id"         UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "action"     VARCHAR(50)  NOT NULL,
        "entity"     VARCHAR(100) NOT NULL,
        "entity_id"  UUID,
        "payload"    JSONB,
        "user_id"    UUID         REFERENCES "users"("id"),
        "created_at" TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quotation_details"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quotations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}
