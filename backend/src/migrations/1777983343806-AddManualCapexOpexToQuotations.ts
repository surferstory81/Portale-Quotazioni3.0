import { MigrationInterface, QueryRunner } from "typeorm";

export class AddManualCapexOpexToQuotations1777983343806 implements MigrationInterface {
    name = 'AddManualCapexOpexToQuotations1777983343806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "quotations" DROP CONSTRAINT "FK_quotations_assigned_admin_id_users"`);
        await queryRunner.query(`ALTER TABLE "quotations" DROP CONSTRAINT "quotations_created_by_fkey"`);
        await queryRunner.query(`ALTER TABLE "quotation_details" DROP CONSTRAINT "quotation_details_quotation_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "logs" DROP CONSTRAINT "logs_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "email_verification_tokens_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" DROP CONSTRAINT "ai_estimations_human_reviewer_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" DROP CONSTRAINT "ai_estimations_quotation_id_fkey"`);
        await queryRunner.query(`DROP INDEX "public"."idx_password_reset_tokens_token"`);
        await queryRunner.query(`DROP INDEX "public"."idx_refresh_tokens_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_email_verification_tokens_token"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ai_estimations_quotation_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ai_estimations_ai_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ai_estimations_generated_at"`);
        await queryRunner.query(`ALTER TABLE "quotations" DROP CONSTRAINT "CHK_quotations_status_values"`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" DROP CONSTRAINT "ai_estimations_confidence_range"`);
        await queryRunner.query(`COMMENT ON TABLE "ai_estimations" IS NULL`);
        await queryRunner.query(`ALTER TABLE "quotations" ADD "manual_capex" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "quotations" ADD "manual_opex" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "quotations" ALTER COLUMN "form_data" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."estimation_data" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."validation_data" IS NULL`);
        await queryRunner.query(`ALTER TYPE "public"."ai_status_enum" RENAME TO "ai_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ai_estimations_ai_status_enum" AS ENUM('AI_GENERATED', 'AI_VALIDATED', 'AI_NEEDS_REVIEW', 'AI_REJECTED', 'HUMAN_APPROVED', 'HUMAN_REJECTED')`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ALTER COLUMN "ai_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ALTER COLUMN "ai_status" TYPE "public"."ai_estimations_ai_status_enum" USING "ai_status"::"text"::"public"."ai_estimations_ai_status_enum"`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ALTER COLUMN "ai_status" SET DEFAULT 'AI_GENERATED'`);
        await queryRunner.query(`DROP TYPE "public"."ai_status_enum_old"`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."ai_status" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."generated_by" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."validated_by" IS NULL`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ALTER COLUMN "generated_at" DROP DEFAULT`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."confidence" IS NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotations" ADD CONSTRAINT "FK_25dcb703da984fa66bde99af598" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotations" ADD CONSTRAINT "FK_4676f306f07289eb029beb0ddcd" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotation_details" ADD CONSTRAINT "FK_3b546c5d73429058bfc67dd9961" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "logs" ADD CONSTRAINT "FK_70c2c3d40d9f661ac502de51349" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ADD CONSTRAINT "FK_20e2bfb0f8464b4c87d29db7718" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ADD CONSTRAINT "FK_5a9cde8db5c8e507a3799b6f888" FOREIGN KEY ("human_reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_estimations" DROP CONSTRAINT "FK_5a9cde8db5c8e507a3799b6f888"`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" DROP CONSTRAINT "FK_20e2bfb0f8464b4c87d29db7718"`);
        await queryRunner.query(`ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147"`);
        await queryRunner.query(`ALTER TABLE "logs" DROP CONSTRAINT "FK_70c2c3d40d9f661ac502de51349"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c"`);
        await queryRunner.query(`ALTER TABLE "quotation_details" DROP CONSTRAINT "FK_3b546c5d73429058bfc67dd9961"`);
        await queryRunner.query(`ALTER TABLE "quotations" DROP CONSTRAINT "FK_4676f306f07289eb029beb0ddcd"`);
        await queryRunner.query(`ALTER TABLE "quotations" DROP CONSTRAINT "FK_25dcb703da984fa66bde99af598"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."confidence" IS 'Confidence score 0-100 from validation agent (>85 HIGH, 70-85 MEDIUM, <70 LOW)'`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ALTER COLUMN "generated_at" SET DEFAULT now()`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."validated_by" IS 'Validation agent version identifier (e.g., validation-agent-v1)'`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."generated_by" IS 'Agent version identifier (e.g., estimation-agent-v1)'`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."ai_status" IS 'AI processing status: AI_GENERATED (estimation complete), AI_VALIDATED (passed validation), AI_NEEDS_REVIEW (flagged for human), AI_REJECTED (failed validation), HUMAN_APPROVED/REJECTED (admin decision)'`);
        await queryRunner.query(`CREATE TYPE "public"."ai_status_enum_old" AS ENUM('AI_GENERATED', 'AI_VALIDATED', 'AI_NEEDS_REVIEW', 'AI_REJECTED', 'HUMAN_APPROVED', 'HUMAN_REJECTED')`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ALTER COLUMN "ai_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ALTER COLUMN "ai_status" TYPE "public"."ai_status_enum_old" USING "ai_status"::"text"::"public"."ai_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ALTER COLUMN "ai_status" SET DEFAULT 'AI_GENERATED'`);
        await queryRunner.query(`DROP TYPE "public"."ai_estimations_ai_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ai_status_enum_old" RENAME TO "ai_status_enum"`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."validation_data" IS 'Validation report JSON from Validation Agent (issues, checks passed, metrics, recommendation)'`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_estimations"."estimation_data" IS 'Complete quotation JSON generated by Estimation Agent (CAPEX/OPEX breakdown, line items, assumptions)'`);
        await queryRunner.query(`ALTER TABLE "quotations" ALTER COLUMN "form_data" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "quotations" DROP COLUMN "manual_opex"`);
        await queryRunner.query(`ALTER TABLE "quotations" DROP COLUMN "manual_capex"`);
        await queryRunner.query(`COMMENT ON TABLE "ai_estimations" IS 'Stores AI-generated cost estimations and validation results for quotations'`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ADD CONSTRAINT "ai_estimations_confidence_range" CHECK (((confidence IS NULL) OR ((confidence >= 0) AND (confidence <= 100))))`);
        await queryRunner.query(`ALTER TABLE "quotations" ADD CONSTRAINT "CHK_quotations_status_values" CHECK (((status)::text = ANY ((ARRAY['INVIATA'::character varying, 'IN VALUTAZIONE'::character varying, 'RESPINTA'::character varying, 'COMPLETATA'::character varying])::text[])))`);
        await queryRunner.query(`CREATE INDEX "idx_ai_estimations_generated_at" ON "ai_estimations" ("generated_at") `);
        await queryRunner.query(`CREATE INDEX "idx_ai_estimations_ai_status" ON "ai_estimations" ("ai_status") `);
        await queryRunner.query(`CREATE INDEX "idx_ai_estimations_quotation_id" ON "ai_estimations" ("quotation_id") `);
        await queryRunner.query(`CREATE INDEX "idx_email_verification_tokens_token" ON "email_verification_tokens" ("token") `);
        await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" ("token") `);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ADD CONSTRAINT "ai_estimations_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_estimations" ADD CONSTRAINT "ai_estimations_human_reviewer_id_fkey" FOREIGN KEY ("human_reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotation_details" ADD CONSTRAINT "quotation_details_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotations" ADD CONSTRAINT "FK_quotations_assigned_admin_id_users" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
