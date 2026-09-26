/**
 * Test de Verificación Aislada de Migración y Rollback:
 * 20260924210000_add_rejection_and_notifications_tenant
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const TEMP_SCHEMA = `test_temp_cot_${Date.now()}`;

async function runTest() {
  console.log(`[TEST-COT-MIGRATION] Creando esquema aislado temporal: ${TEMP_SCHEMA}...`);
  await pool.query(`CREATE SCHEMA "${TEMP_SCHEMA}"`);

  try {
    // 1. Crear tablas mínimas
    await pool.query(`
      CREATE TABLE "${TEMP_SCHEMA}"."empresas" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nombre TEXT NOT NULL
      );
      CREATE TABLE "${TEMP_SCHEMA}"."cotizaciones" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        numero_cotizacion TEXT NOT NULL
      );
      CREATE TABLE "${TEMP_SCHEMA}"."notificaciones" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        estado TEXT NOT NULL
      );
    `);
    console.log('✓ Tablas base creadas.');

    // 2. Aplicar migration.sql
    console.log('[TEST-COT-MIGRATION] Aplicando migration.sql en esquema aislado...');
    const migrationSql = fs.readFileSync(
      path.resolve(__dirname, '../prisma/migrations/20260924210000_add_rejection_and_notifications_tenant/migration.sql'),
      'utf8'
    );
    await pool.query(`SET search_path TO "${TEMP_SCHEMA}"; ${migrationSql} RESET search_path;`);

    // 3. Probar inserción con los nuevos campos
    await pool.query(`
      INSERT INTO "${TEMP_SCHEMA}"."cotizaciones"(numero_cotizacion, motivo_rechazo, fecha_envio, fecha_vista, fecha_aceptacion)
      VALUES ('COT-TEST-01', 'Presupuesto fuera de alcance', NOW(), NOW(), NULL);
    `);
    const checkCot = await pool.query(
      `SELECT motivo_rechazo, fecha_envio FROM "${TEMP_SCHEMA}"."cotizaciones" WHERE numero_cotizacion = 'COT-TEST-01'`
    );
    if (checkCot.rows[0].motivo_rechazo !== 'Presupuesto fuera de alcance') {
      throw new Error('Fallo: motivo_rechazo no se guardó correctamente.');
    }
    console.log('✓ Nuevos campos en cotizaciones validados exitosamente.');

    // 4. Probar rollback.sql
    console.log('[TEST-COT-MIGRATION] Aplicando rollback.sql...');
    const rollbackSql = fs.readFileSync(
      path.resolve(__dirname, '../prisma/migrations/20260924210000_add_rejection_and_notifications_tenant/rollback.sql'),
      'utf8'
    );
    await pool.query(`SET search_path TO "${TEMP_SCHEMA}"; ${rollbackSql} RESET search_path;`);

    // Verificar que las columnas fueron removidas
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = '${TEMP_SCHEMA}' AND table_name = 'cotizaciones' AND column_name = 'motivo_rechazo'
    `);
    if (checkColumns.rows.length > 0) {
      throw new Error('Fallo: motivo_rechazo no fue eliminado por rollback.');
    }
    console.log('✓ rollback.sql ejecutado exitosamente revirtiendo los cambios.');

    console.log('[TEST-COT-MIGRATION] ✅ PRUEBA DE MIGRACIÓN Y ROLLBACK EXITOSA.');
  } finally {
    console.log(`[TEST-COT-MIGRATION] Limpiando esquema temporal ${TEMP_SCHEMA}...`);
    await pool.query(`DROP SCHEMA IF EXISTS "${TEMP_SCHEMA}" CASCADE`);
    await pool.end();
  }
}

runTest().catch((err) => {
  console.error('❌ Error en test de migración:', err);
  process.exit(1);
});
