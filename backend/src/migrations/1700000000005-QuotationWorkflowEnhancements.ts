import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuotationWorkflowEnhancements1700000000005
  implements MigrationInterface
{
  name = 'QuotationWorkflowEnhancements1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD COLUMN IF NOT EXISTS "project_code" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "project_name" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS "form_data" JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    await queryRunner.query(`
      UPDATE "quotations"
      SET "project_name" = COALESCE(NULLIF("project_name", ''), "title"),
          "project_code" = COALESCE(NULLIF("project_code", ''), "title")
      WHERE "project_name" IS NULL OR "project_code" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      ALTER COLUMN "project_code" SET NOT NULL,
      ALTER COLUMN "project_name" SET NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE "quotations"
      SET "status" = 'INVIATA'
      WHERE "status" = 'DRAFT' OR "status" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      ALTER COLUMN "status" SET DEFAULT 'INVIATA';
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_quotations_status_values'
        ) THEN
          ALTER TABLE "quotations"
          ADD CONSTRAINT "CHK_quotations_status_values"
          CHECK ("status" IN ('INVIATA', 'IN VALUTAZIONE', 'RESPINTA', 'COMPLETATA'));
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP CONSTRAINT IF EXISTS "CHK_quotations_status_values";
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      ALTER COLUMN "status" SET DEFAULT 'DRAFT';
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP COLUMN IF EXISTS "form_data",
      DROP COLUMN IF EXISTS "project_name",
      DROP COLUMN IF EXISTS "project_code";
    `);
  }
}
