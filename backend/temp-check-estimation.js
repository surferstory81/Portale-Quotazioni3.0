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

async function checkEstimation() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Find quotation PRJ0123456
    const quotation = await AppDataSource.query(`
      SELECT id, project_code, project_name, form_data, status
      FROM quotations 
      WHERE project_code = 'PRJ0123456'
      LIMIT 1
    `);

    console.log('\n📋 QUOTATION DATA:');
    console.log('ID:', quotation[0].id);
    console.log('Project Code:', quotation[0].project_code);
    console.log('Status:', quotation[0].status);
    console.log('\n📝 FORM DATA (rilevante):');
    const fd = quotation[0].form_data;
    console.log('pipeline:', fd.pipeline);
    console.log('qa:', fd.qa);
    console.log('observability:', fd.observability);
    console.log('infraMicroservices:', fd.infraMicroservices);
    console.log('microservicesCount:', fd.microservicesCount);
    console.log('needNewInfrastructure:', fd.needNewInfrastructure);
    console.log('computeCores:', fd.computeCores);
    console.log('storageGb:', fd.storageGb);

    // Find AI estimation
    const estimation = await AppDataSource.query(`
      SELECT id, quotation_id, ai_status, capex_total, opex_year_1, 
             capex_breakdown, opex_breakdown, assumptions, 
             input_tokens, output_tokens, estimated_cost_usd,
             created_at
      FROM ai_estimations 
      WHERE quotation_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [quotation[0].id]);

    if (!estimation || estimation.length === 0) {
      console.log('\n❌ No AI estimation found');
      await AppDataSource.destroy();
      process.exit(0);
    }

    console.log('\n🤖 AI ESTIMATION:');
    console.log('ID:', estimation[0].id);
    console.log('Status:', estimation[0].ai_status);
    console.log('CAPEX Total:', estimation[0].capex_total);
    console.log('OPEX Year 1:', estimation[0].opex_year_1);
    console.log('Tokens:', estimation[0].input_tokens, 'in +', estimation[0].output_tokens, 'out');
    console.log('Cost:', estimation[0].estimated_cost_usd, 'USD');
    
    console.log('\n💰 CAPEX BREAKDOWN:');
    console.log(JSON.stringify(estimation[0].capex_breakdown, null, 2));
    
    console.log('\n📊 OPEX BREAKDOWN:');
    console.log(JSON.stringify(estimation[0].opex_breakdown, null, 2));
    
    console.log('\n📋 ASSUMPTIONS:');
    console.log(JSON.stringify(estimation[0].assumptions, null, 2));

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkEstimation();
