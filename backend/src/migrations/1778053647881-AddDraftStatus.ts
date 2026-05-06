import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDraftStatus1778053647881 implements MigrationInterface {
    name = 'AddDraftStatus1778053647881'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add BOZZA to the quotation status enum
        await queryRunner.query(`ALTER TYPE "quotations_status_enum" ADD VALUE 'BOZZA'`);
        await queryRunner.query(`ALTER TABLE "quotations" ALTER COLUMN "form_data" SET DEFAULT '{}'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing enum values directly
        // You would need to recreate the enum type without BOZZA
        await queryRunner.query(`ALTER TABLE "quotations" ALTER COLUMN "form_data" SET DEFAULT '{}'`);
    }

}
