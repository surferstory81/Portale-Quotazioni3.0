import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedRolesAndAdmin1700000000002 implements MigrationInterface {
  name = 'SeedRolesAndAdmin1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert default roles
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description")
      VALUES
        ('USER',  'Utente standard'),
        ('ADMIN', 'Amministratore di sistema')
      ON CONFLICT ("name") DO NOTHING;
    `);

    // Retrieve ADMIN role id
    const [adminRole] = await queryRunner.query(
      `SELECT "id" FROM "roles" WHERE "name" = 'ADMIN'`,
    );

    // Hash default admin password
    const passwordRaw = process.env.ADMIN_PASSWORD || 'Admin@2024!';
    const passwordHash = await bcrypt.hash(passwordRaw, 12);

    const matricola = process.env.ADMIN_MATRICOLA || 'ADMIN001';
    const email = process.env.ADMIN_EMAIL || 'admin@quotazioni.local';

    // Insert default admin user
    await queryRunner.query(
      `
      INSERT INTO "users" ("matricola", "email", "password_hash", "is_verified", "role_id")
      VALUES ($1, $2, $3, true, $4)
      ON CONFLICT ("matricola") DO NOTHING;
      `,
      [matricola, email, passwordHash, adminRole.id],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const matricola = process.env.ADMIN_MATRICOLA || 'ADMIN001';
    await queryRunner.query(`DELETE FROM "users" WHERE "matricola" = $1`, [
      matricola,
    ]);
    await queryRunner.query(
      `DELETE FROM "roles" WHERE "name" IN ('USER', 'ADMIN')`,
    );
  }
}
