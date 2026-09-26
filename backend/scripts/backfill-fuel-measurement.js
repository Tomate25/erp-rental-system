// Reconciles clearly identified equipment with the fuel gauge units supplied
// by the customer. Dry-run by default; pass --apply to persist changes.
require('dotenv').config();
const { Pool } = require('pg');

const empresaId = process.argv.find((arg) => arg.startsWith('--empresa-id='))?.split('=')[1];
const apply = process.argv.includes('--apply');

if (!empresaId || !/^[0-9a-f-]{36}$/i.test(empresaId)) {
  console.error('Uso: node scripts/backfill-fuel-measurement.js --empresa-id=UUID [--apply]');
  process.exit(1);
}

function classify(description) {
  const name = (description || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/BACKHOE|RETROEXCAVADORA|MINI\s*CARGADOR|BOBCAT MINI CARGADOR/.test(name)) return 'BARRAS';
  if (/^RODO\b/.test(name) && /(?:\b3\s*(?:TON|TM)\b|\b3TM\b)/.test(name)) return 'BARRAS';
  if (/^COMPACTADORA\b|^TORRE DE ILUMINACION\b/.test(name)) return 'PULGADAS';
  if (/^RODO\b/.test(name)) return 'PULGADAS';
  if (/^COMPRESOR\b/.test(name)) return 'PORCENTAJE';
  if (/^GENERADOR\b/.test(name) && /(?:\bPEQUENO\b|\b3[,.]?500\b|\b3[,.]?300\b)/.test(name)) return 'PULGADAS';
  if (/^GENERADOR\b/.test(name) && /(?:\b23\s*KVH\b|\b50\s*KVH\b|\b200K\b)/.test(name)) return 'PORCENTAJE';
  return null;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, descripcion, tipo_medicion_combustible FROM equipos WHERE empresa_id = $1 ORDER BY id FOR UPDATE',
      [empresaId],
    );
    const changes = rows.map((row) => ({ ...row, target: classify(row.descripcion) }))
      .filter((row) => row.target && row.target !== row.tipo_medicion_combustible);
    const counts = changes.reduce((acc, row) => {
      acc[row.target] = (acc[row.target] || 0) + 1;
      return acc;
    }, {});
    console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', examined: rows.length, changes: changes.length, byUnit: counts }, null, 2));
    for (const row of changes) console.log(`${row.descripcion} : ${row.tipo_medicion_combustible} -> ${row.target}`);

    if (apply) {
      for (const row of changes) {
        await client.query(
          'UPDATE equipos SET tipo_medicion_combustible = $1, updated_at = NOW() WHERE id = $2 AND empresa_id = $3',
          [row.target, row.id, empresaId],
        );
      }
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
