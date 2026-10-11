require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const TARGET_EMPRESA_ID = 'fedb4b05-e281-4956-9367-5a0530976e60';

async function run() {
  const wb = XLSX.readFile('C:/Users/abdia/Downloads/inventario_tarifas_junio2026.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1).filter((r) => r && r[0]);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query('SELECT codigo, precio_renta_dia, precio_renta_hora FROM equipos WHERE empresa_id = $1', [TARGET_EMPRESA_ID]);
  const db = new Map(res.rows.map((r) => [r.codigo, r]));

  const zeroPrices = [];
  for (const r of rows) {
    const cod = String(r[0]).trim();
    const curr = db.get(cod);
    if (!curr || !curr.precio_renta_dia || Number(curr.precio_renta_dia) <= 0) {
      zeroPrices.push({ codigo: cod, desc: r[1], cant: r[2], curr });
    }
  }
  console.log(`Artículos sin precio o precio 0 en DB (${zeroPrices.length}):`);
  console.log(zeroPrices);
  await pool.end();
}
run().catch(console.error);
