require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const r1 = await pool.query('SELECT count(*) FROM equipos WHERE empresa_id = $1', ['fedb4b05-e281-4956-9367-5a0530976e60']);
  console.log('Equipos en fedb (empresa activa):', r1.rows[0].count);

  const r2 = await pool.query('SELECT count(*) FROM equipos');
  console.log('Total equipos en toda la base:', r2.rows[0].count);

  const sum1 = await pool.query('SELECT sum(cantidad_total) as tot, sum(cantidad_disponible) as disp FROM equipos WHERE empresa_id = $1', ['fedb4b05-e281-4956-9367-5a0530976e60']);
  console.log('Unidades en fedb:', sum1.rows[0]);

  await pool.end();
}
run().catch(console.error);
