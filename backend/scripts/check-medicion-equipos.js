require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT id, codigo, descripcion, modelo, tipo_medicion_combustible
    FROM equipos
    ORDER BY descripcion ASC
  `);
  console.log(`Total equipos: ${res.rows.length}`);
  
  // Imprimir resumen agrupado por descripcion / modelo
  const map = {};
  for (const r of res.rows) {
    const key = (r.descripcion || r.modelo || 'SIN_DESC').trim().toUpperCase();
    if (!map[key]) {
      map[key] = { count: 0, tipoMedicion: r.tipo_medicion_combustible, sampleCode: r.codigo };
    }
    map[key].count++;
  }
  console.log('Equipos en sistema:', map);

  await pool.end();
}

run().catch(console.error);
