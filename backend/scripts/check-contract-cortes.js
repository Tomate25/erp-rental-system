require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const c = await pool.query("SELECT id, codigo, estado, fecha_inicio, fecha_fin, cotizacion_id FROM contratos WHERE codigo = 'CTR-2026-0001'");
  console.log('CONTRATO:', c.rows);
  if (c.rows.length > 0) {
    const cortes = await pool.query("SELECT * FROM cortes_facturacion WHERE contrato_id = $1 ORDER BY numero_corte", [c.rows[0].id]);
    console.log('CORTES:', cortes.rows);
    const cot = await pool.query("SELECT id, numero_cotizacion, total, subtotal, iva FROM cotizaciones WHERE id = $1", [c.rows[0].cotizacion_id]);
    const facturas = await pool.query("SELECT id, folio, total, estado FROM facturas WHERE contrato_id = $1", [c.rows[0].id]);
    console.log('FACTURAS:', facturas.rows);
  }
}

run().catch(console.error).finally(() => pool.end());
