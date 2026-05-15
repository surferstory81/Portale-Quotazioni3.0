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

  const q = await AppDataSource.query("SELECT id, form_data FROM quotations WHERE project_code = 'PRJ0123456'");
  const fd = q[0].form_data;

  console.log('📋 PIPELINE VALUE:');
  console.log('  Raw:', JSON.stringify(fd.pipeline));
  console.log('  Char codes:', [...fd.pipeline].map(c => c.charCodeAt(0)));

  const e = await AppDataSource.query("SELECT estimation_data, validation_data FROM ai_estimations WHERE quotation_id = $1 ORDER BY created_at DESC LIMIT 1", [q[0].id]);
  const est = e[0].estimation_data;
  const val = e[0].validation_data;

  console.log('\n💰 CAPEX Total:', est.summary.capex_total);
  console.log('📊 OPEX Year 1:', est.summary.opex_year_1);
  console.log('\n📦 CAPEX Line Items:');
  (est.capex?.line_items || []).forEach(item => console.log(`  - ${item.description}: €${item.amount}`));
  console.log('\n📦 OPEX Line Items:');
  (est.opex?.year_1?.line_items || []).forEach(item => console.log(`  - ${item.description}: €${item.amount}`));
  console.log('\n📋 Key Assumptions:');
  (est.assumptions || []).slice(0, 10).forEach(a => console.log(`  - ${a}`));
  console.log('\n⚠️ Validation Issues:');
  (val?.issues || []).forEach(i => console.log(`\n[${i.severity}] ${i.category}:\n${i.message}`));

  await AppDataSource.destroy();
}

check().catch(console.error);