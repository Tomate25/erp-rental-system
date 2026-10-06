const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const r = await pool.query(`
    SELECT e.id, e.codigo, e.modelo, e.descripcion, e.modalidad_renta, e.precio_renta_dia, e.precio_renta_hora, c.nombre as cat, c.is_linea_amarilla
    FROM equipos e
    JOIN categorias c ON e.categoria_id = c.id
    WHERE e.codigo LIKE '08-%' OR c.nombre IN ('MAQUINA AMARILLA', 'MAQUINARIA PESADA', 'Excavación')
    ORDER BY e.codigo
  `);
  console.log('Equipos Maquinaria Amarilla / Pesada / 08-xx:');
  console.log(r.rows);

  await pool.end();
}
run().catch(console.error);
