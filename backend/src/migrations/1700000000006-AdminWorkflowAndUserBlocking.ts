import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminWorkflowAndUserBlocking1700000000006
  implements MigrationInterface
{
  name = 'AdminWorkflowAndUserBlocking1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "is_blocked" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMP NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD COLUMN IF NOT EXISTS "assigned_admin_id" UUID NULL,
      ADD COLUMN IF NOT EXISTS "taken_in_charge_at" TIMESTAMP NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_quotations_assigned_admin_id_users'
            AND table_name = 'quotations'
        ) THEN
          ALTER TABLE "quotations"
          ADD CONSTRAINT "FK_quotations_assigned_admin_id_users"
          FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id")
          ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP CONSTRAINT IF EXISTS "FK_quotations_assigned_admin_id_users";
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      DROP COLUMN IF EXISTS "taken_in_charge_at",
      DROP COLUMN IF EXISTS "assigned_admin_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "blocked_at",
      DROP COLUMN IF EXISTS "is_blocked";
    `);
  }
}
