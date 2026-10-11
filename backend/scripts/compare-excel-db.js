require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');

const TARGET_EMPRESA_ID = 'fedb4b05-e281-4956-9367-5a0530976e60';

async function main() {
  const wb = XLSX.readFile('C:/Users/abdia/Downloads/inventario_tarifas_junio2026.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const data = rows.slice(1).filter((r) => r && r[0]);

  console.log(`Excel leído: ${data.length} filas.`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query(
    'SELECT id, codigo, descripcion, modelo, numero_serie, cantidad_total, precio_renta_dia, precio_renta_hora, precio_dia_b, precio_dia_c, precio_hora_b, precio_hora_c, modalidad_renta, categoria_id, marca_id, sucursal_id FROM equipos WHERE empresa_id = $1',
    [TARGET_EMPRESA_ID]
  );

  const dbByCode = new Map();
  for (const r of res.rows) {
    if (r.codigo) {
      dbByCode.set(r.codigo.trim(), r);
    }
  }

  console.log(`Equipos actuales en DB (empresa activa): ${res.rows.length}`);

  let found = 0;
  let missing = [];
  let foundWithPrices = 0;

  for (const row of data) {
    const cod = String(row[0]).trim();
    if (dbByCode.has(cod)) {
      found++;
      const current = dbByCode.get(cod);
      if (current.precio_renta_dia && Number(current.precio_renta_dia) > 0) {
        foundWithPrices++;
      }
    } else {
      missing.push(cod);
    }
  }

  console.log(`Coincidencias de código con DB: ${found} / ${data.length}`);
  console.log(`Coincidencias con precio > 0: ${foundWithPrices}`);
  console.log(`Códigos nuevos en Excel no presentes en DB: ${missing.length}`, missing.slice(0, 15));

  await pool.end();
}

main().catch(console.error);
