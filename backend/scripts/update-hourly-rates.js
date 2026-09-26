require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    UPDATE equipos
    SET precio_renta_hora = ROUND(precio_renta_dia / 8.0, 4),
        modalidad_renta = 'DIA_Y_HORA',
        updated_at = NOW()
    WHERE empresa_id = 'fedb4b05-e281-4956-9367-5a0530976e60'
      AND (precio_renta_hora IS NULL OR precio_renta_hora = 0)
      AND precio_renta_dia > 0
  `);
  console.log('Equipos actualizados con tarifa hora y modalidad DIA_Y_HORA:', res.rowCount);

  const sample = await pool.query(`
    SELECT codigo, descripcion, precio_renta_dia, precio_renta_hora, modalidad_renta
    FROM equipos 
    WHERE empresa_id = 'fedb4b05-e281-4956-9367-5a0530976e60'
    ORDER BY codigo ASC
    LIMIT 10
  `);
  console.log('Muestra actualizada:', sample.rows);

  await pool.end();
}

run().catch(console.error);
