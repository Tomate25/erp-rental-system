/** Reinicia el flujo comercial/operativo de erp_dev; conserva datos maestros y auditoría. */
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const operationalTables = [
  'pagos', 'facturas', 'cortes_facturacion',
  'mantenimientos', 'inspecciones_dano', 'detalle_devolucion', 'devoluciones',
  'inspecciones_salida', 'detalle_despacho', 'despachos',
  'solicitudes_retorno', 'solicitudes_despacho', 'reservas',
  'detalle_contratos', 'contratos', 'detalle_cotizacion', 'cotizaciones',
  'solicitudes', 'lecturas_horometro', 'notificaciones',
];
const preservedTables = [
  'empresas', 'sucursales', 'usuarios', 'roles', 'permisos',
  'rol_permisos', 'usuario_roles', 'clientes', 'contactos_cliente',
  'categorias', 'subcategorias', 'marcas', 'productos', 'equipos',
  'reglas_comision', 'auditorias',
];

async function counts(client, names) {
  const result = {};
  for (const name of names) {
    const row = await client.query(`SELECT count(*)::int AS total FROM "${name}"`);
    result[name] = row.rows[0].total;
  }
  return result;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || new URL(databaseUrl).pathname !== '/erp_dev') {
    throw new Error('Solo se permite limpiar la base erp_dev.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    const before = await counts(client, [...operationalTables, ...preservedTables]);
    console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', database: 'erp_dev', before }, null, 2));
    if (!apply) return;

    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '15s'");
    await client.query('SELECT pg_advisory_xact_lock(20260926, 2)');
    await client.query(`LOCK TABLE ${[...operationalTables, ...preservedTables].map((name) => `"${name}"`).join(', ')} IN ACCESS EXCLUSIVE MODE`);

    const preservedBefore = await counts(client, preservedTables);
    const deleted = {};
    for (const name of operationalTables) {
      const result = await client.query(`DELETE FROM "${name}"`);
      deleted[name] = result.rowCount;
    }

    // El estado físico BAJA/FUERA_DE_SERVICIO se conserva; los compromisos de renta y
    // taller del flujo borrado vuelven a disponibilidad, sin modificar el horómetro base.
    const reset = await client.query(`
      UPDATE equipos SET estado = 'DISPONIBLE', cantidad_disponible = cantidad_total,
        updated_at = NOW()
      WHERE estado NOT IN ('BAJA', 'FUERA_DE_SERVICIO')
        AND (estado <> 'DISPONIBLE' OR cantidad_disponible <> cantidad_total)
    `);

    const operationalAfter = await counts(client, operationalTables);
    const preservedAfter = await counts(client, preservedTables);
    const clean = Object.values(operationalAfter).every((count) => count === 0);
    const preserved = Object.entries(preservedBefore).every(([name, count]) => preservedAfter[name] === count);
    if (!clean || !preserved) throw new Error('Falló la verificación; transacción revertida.');

    await client.query('COMMIT');
    console.log(JSON.stringify({ status: 'COMMITTED', deleted, equiposRestablecidos: reset.rowCount, operationalAfter, preservedAfter }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
