require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const cols = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name IN ('contratos', 'cotizaciones')
    ORDER BY table_name, ordinal_position
  `);
  console.log(cols.rows);

  const contr = await pool.query('SELECT * FROM contratos LIMIT 5');
  console.log('Contratos:', contr.rows);

  const cot = await pool.query('SELECT * FROM cotizaciones LIMIT 5');
  console.log('Cotizaciones:', cot.rows);

  await pool.end();
}
run().catch(console.error);
