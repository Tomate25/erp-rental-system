require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const r = await pool.query(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'equipos';
  `);
  console.log('Foreign keys pointing to equipos:');
  console.table(r.rows);

  for (const row of r.rows) {
    const countRes = await pool.query(`SELECT count(*) FROM "${row.table_name}" WHERE "${row.column_name}" IS NOT NULL`);
    console.log(`Table ${row.table_name}.${row.column_name}: ${countRes.rows[0].count} rows`);
  }

  // Verificar cuántas empresas hay y equipos por empresa
  const empRes = await pool.query(`
    SELECT e.id, e.nombre, count(eq.id) as total_equipos
    FROM empresas e
    LEFT JOIN equipos eq ON eq.empresa_id = e.id
    GROUP BY e.id, e.nombre
  `);
  console.log('Equipos por empresa:');
  console.table(empRes.rows);

  await pool.end();
}

check().catch(console.error);
