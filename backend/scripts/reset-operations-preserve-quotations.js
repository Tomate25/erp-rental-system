/**
 * Reinicia únicamente operaciones dependientes de contratos en erp_dev.
 * Ejecución normal: node scripts/reset-operations-preserve-quotations.js
 * Aplicar:         node scripts/reset-operations-preserve-quotations.js --apply
 * Exige respaldo verificado antes de --apply.
 */
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const tables = [
  'pagos', 'facturas', 'cortes_facturacion',
  'inspecciones_dano', 'detalle_devolucion', 'devoluciones',
  'inspecciones_salida', 'detalle_despacho', 'despachos',
  'solicitudes_retorno', 'solicitudes_despacho', 'reservas',
  'detalle_contratos', 'contratos',
];
const preservedTables = [
  'cotizaciones', 'detalle_cotizacion', 'clientes', 'equipos',
  'productos', 'usuarios', 'empresas', 'sucursales', 'mantenimientos',
  'notificaciones', 'solicitudes', 'auditorias',
];

async function counts(client, names) {
  const entries = [];
  for (const name of names) {
    const result = await client.query(`SELECT count(*)::int AS count FROM "${name}"`);
    entries.push([name, result.rows[0].count]);
  }
  return Object.fromEntries(entries);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const database = new URL(process.env.DATABASE_URL).pathname.slice(1);
  if (database !== 'erp_dev') throw new Error(`Base no permitida: ${database}`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const before = await counts(client, [...tables, ...preservedTables]);
    const states = await client.query('SELECT estado, count(*)::int AS cantidad FROM cotizaciones GROUP BY estado ORDER BY estado');
    const equipment = await client.query(`
      SELECT e.id, e.codigo, e.estado, e.cantidad_total, e.cantidad_disponible
      FROM equipos e WHERE e.id IN (
        SELECT equipo_id FROM detalle_despacho UNION SELECT equipo_id FROM reservas
      ) ORDER BY e.codigo
    `);
    console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', database, before, quotationStates: states.rows, affectedEquipment: equipment.rows }, null, 2));
    if (!apply) return;

    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query('SELECT pg_advisory_xact_lock(20260925, 1)');
    await client.query(`LOCK TABLE ${[...tables, ...preservedTables, 'lecturas_horometro'].map(n => `"${n}"`).join(', ')} IN ACCESS EXCLUSIVE MODE`);

    const preservedBefore = await counts(client, preservedTables);
    const quoteIdsBefore = (await client.query('SELECT id FROM cotizaciones ORDER BY id')).rows.map(row => row.id);
    const linkedQuoteIds = (await client.query(`
      SELECT cotizacion_id AS id FROM contratos WHERE cotizacion_id IS NOT NULL
      UNION SELECT cotizacion_id AS id FROM facturas WHERE cotizacion_id IS NOT NULL
    `)).rows.map(row => row.id);
    const affectedIds = (await client.query(`
      SELECT equipo_id AS id FROM detalle_despacho
      UNION SELECT equipo_id AS id FROM reservas
    `)).rows.map(row => row.id);

    const deleted = {};
    for (const name of tables) {
      const result = await client.query(`DELETE FROM "${name}"`);
      deleted[name] = result.rowCount;
    }
    deleted.lecturas_horometro_despacho = (await client.query(
      "DELETE FROM lecturas_horometro WHERE origen = 'DESPACHO'",
    )).rowCount;

    let resetQuotes = 0;
    if (linkedQuoteIds.length) {
      resetQuotes = (await client.query(`
        UPDATE cotizaciones SET estado = 'ACEPTADA', updated_at = NOW()
        WHERE id = ANY($1::text[]) AND estado IN ('CONVERTIDA_A_CONTRATO', 'FACTURADA')
      `, [linkedQuoteIds])).rowCount;
    }
    let resetEquipment = 0;
    if (affectedIds.length) {
      resetEquipment = (await client.query(`
        UPDATE equipos SET estado = 'DISPONIBLE', cantidad_disponible = cantidad_total, updated_at = NOW()
        WHERE id = ANY($1::text[]) AND estado IN ('DESPACHADO', 'RESERVADO')
      `, [affectedIds])).rowCount;
    }

    const preservedAfter = await counts(client, preservedTables);
    const quoteIdsAfter = (await client.query('SELECT id FROM cotizaciones ORDER BY id')).rows.map(row => row.id);
    const operationalAfter = await counts(client, tables);
    const stillDispatched = (await client.query("SELECT count(*)::int AS count FROM equipos WHERE estado = 'DESPACHADO'")).rows[0].count;
    if (JSON.stringify(preservedBefore) !== JSON.stringify(preservedAfter) ||
        JSON.stringify(quoteIdsBefore) !== JSON.stringify(quoteIdsAfter) ||
        Object.values(operationalAfter).some(count => count !== 0) || stillDispatched !== 0) {
      throw new Error('La verificación de integridad falló; se revierte toda la transacción.');
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({ status: 'COMMITTED', deleted, resetQuotes, resetEquipment, preservedAfter, operationalAfter, stillDispatched }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
