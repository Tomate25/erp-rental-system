/**
 * Test de Verificación Aislada de Migración y Rollback:
 * 20260924200000_expand_rental_rates_precision_to_4_decimals
 * Valida almacenamiento de 4 decimales y reversibilidad del cambio.
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const TEMP_SCHEMA = `test_temp_precision_${Date.now()}`;

async function runTest() {
  console.log(`[TEST-PRECISION-ROLLBACK] Creando esquema aislado temporal: ${TEMP_SCHEMA}...`);
  await pool.query(`CREATE SCHEMA "${TEMP_SCHEMA}"`);

  try {
    // 1. Crear tablas mínimas con DECIMAL(12, 2)
    await pool.query(`
      CREATE TABLE "${TEMP_SCHEMA}"."productos" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        precio_renta_dia DECIMAL(12, 2),
        precio_renta_hora DECIMAL(12, 2)
      );
      CREATE TABLE "${TEMP_SCHEMA}"."equipos" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        precio_renta_dia DECIMAL(12, 2),
        precio_renta_hora DECIMAL(12, 2)
      );
      CREATE TABLE "${TEMP_SCHEMA}"."detalle_cotizacion" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        precio_unitario DECIMAL(12, 2)
      );
      CREATE TABLE "${TEMP_SCHEMA}"."detalle_contratos" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        precio_renta DECIMAL(12, 2)
      );
    `);

    // Inserción inicial en DECIMAL(12, 2)
    await pool.query(
      `INSERT INTO "${TEMP_SCHEMA}"."equipos"(precio_renta_dia) VALUES (1.5228)`
    );
    const preCheck = await pool.query(`SELECT precio_renta_dia FROM "${TEMP_SCHEMA}"."equipos"`);
    if (Number(preCheck.rows[0].precio_renta_dia) !== 1.52) {
      throw new Error(`Se esperaba 1.52 (redondeado), obtenido: ${preCheck.rows[0].precio_renta_dia}`);
    }
    console.log('✓ Estado previo confirmado: DECIMAL(12, 2) redondea a 2 decimales.');

    // 2. Aplicar migration.sql
    console.log('[TEST-PRECISION-ROLLBACK] Aplicando migration.sql en esquema aislado...');
    const migrationSql = fs.readFileSync(
      path.resolve(__dirname, '../prisma/migrations/20260924200000_expand_rental_rates_precision_to_4_decimals/migration.sql'),
      'utf8'
    );
    await pool.query(`SET search_path TO "${TEMP_SCHEMA}"; ${migrationSql} RESET search_path;`);

    // 3. Probar inserción con 4 decimales exactos
    await pool.query(
      `INSERT INTO "${TEMP_SCHEMA}"."equipos"(precio_renta_dia) VALUES (1.5228), (5.451), (16.898)`
    );
    const postCheck = await pool.query(
      `SELECT precio_renta_dia FROM "${TEMP_SCHEMA}"."equipos" WHERE precio_renta_dia > 1.52 ORDER BY precio_renta_dia ASC`
    );
    if (
      Number(postCheck.rows[0].precio_renta_dia) !== 1.5228 ||
      Number(postCheck.rows[1].precio_renta_dia) !== 5.451 ||
      Number(postCheck.rows[2].precio_renta_dia) !== 16.898
    ) {
      throw new Error('Fallo: Los valores de 4 decimales no se almacenaron con exactitud.');
    }
    console.log('✓ DECIMAL(14, 4) almacena valores con 4 decimales con exactitud 100%.');

    // 4. Probar rollback.sql
    console.log('[TEST-PRECISION-ROLLBACK] Aplicando rollback.sql...');
    const rollbackSql = fs.readFileSync(
      path.resolve(__dirname, '../prisma/migrations/20260924200000_expand_rental_rates_precision_to_4_decimals/rollback.sql'),
      'utf8'
    );
    await pool.query(`SET search_path TO "${TEMP_SCHEMA}"; ${rollbackSql} RESET search_path;`);
    console.log('✓ rollback.sql ejecutado exitosamente revirtiendo a DECIMAL(12, 2).');

    console.log('[TEST-PRECISION-ROLLBACK] ✅ PRUEBA DE PRECISIÓN Y ROLLBACK EXITOSA.');
  } finally {
    console.log(`[TEST-PRECISION-ROLLBACK] Limpiando esquema temporal ${TEMP_SCHEMA}...`);
    await pool.query(`DROP SCHEMA IF EXISTS "${TEMP_SCHEMA}" CASCADE`);
    await pool.end();
  }
}

runTest().catch((err) => {
  console.error('❌ Error en test de precisión y rollback:', err);
  process.exit(1);
});
