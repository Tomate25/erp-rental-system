require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const users = await pool.query(`
    SELECT u.id, u.email, u.nombre, u.sucursal_id, u.empresa_id,
           COALESCE(json_agg(r.nombre) FILTER (WHERE r.nombre IS NOT NULL), '[]') as roles
    FROM usuarios u
    LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
    LEFT JOIN roles r ON ur.rol_id = r.id
    GROUP BY u.id, u.email, u.nombre, u.sucursal_id, u.empresa_id
  `);
  console.log('USERS & ROLES:', JSON.stringify(users.rows, null, 2));

  const eqStates = await pool.query(`
    SELECT estado, count(*), sum(cantidad_total) as total_qty, sum(cantidad_disponible) as disp_qty
    FROM equipos 
    WHERE empresa_id = 'fedb4b05-e281-4956-9367-5a0530976e60'
    GROUP BY estado
  `);
  console.log('EQUIPMENT STATES:', eqStates.rows);

  const sample = await pool.query(`
    SELECT id, codigo, descripcion, modelo, estado, cantidad_disponible, precio_renta_dia, precio_renta_hora
    FROM equipos 
    WHERE empresa_id = 'fedb4b05-e281-4956-9367-5a0530976e60' 
    LIMIT 10
  `);
  console.log('SAMPLE EQUIPOS:', sample.rows);

  await pool.end();
}

run().catch(console.error);
