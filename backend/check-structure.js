const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'portale_quotazioni',
  synchronize: false,
});

async function check() {
  await AppDataSource.initialize();

  const q = await AppDataSource.query("SELECT id FROM quotations WHERE project_code = 'PRJ0123456'");
  const e = await AppDataSource.query("SELECT estimation_data FROM ai_estimations WHERE quotation_id = $1 ORDER BY created_at DESC LIMIT 1", [q[0].id]);

  console.log('FULL ESTIMATION_DATA STRUCTURE:');
  console.log(JSON.stringify(e[0].estimation_data, null, 2));

  await AppDataSource.destroy();
}

check().catch(console.error);