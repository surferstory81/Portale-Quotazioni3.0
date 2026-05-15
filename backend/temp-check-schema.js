const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'portale_quotazioni',
  synchronize: false,
  logging: false,
});

async function checkSchema() {
  try {
    await AppDataSource.initialize();
    
    const columns = await AppDataSource.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_estimations'
      ORDER BY ordinal_position
    `);
    
    console.log('ai_estimations columns:');
    columns.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
