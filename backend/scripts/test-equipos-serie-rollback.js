/**
 * Test de Verificación Aislada de Migración y Rollback:
 * 20260924190000_remove_unique_numero_serie_from_equipos
 * Valida aborto de precondición ante series repetidas y éxito al revertir.
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const TEMP_SCHEMA = `test_temp_serie_${Date.now()}`;

async function runTest() {
  console.log(`[TEST-SERIE-ROLLBACK] Creando esquema aislado temporal: ${TEMP_SCHEMA}...`);
  await pool.query(`CREATE SCHEMA "${TEMP_SCHEMA}"`);

  try {
    // 1. Crear tabla mínima de equipos en el esquema aislado con la restricción previa
    await pool.query(`
      CREATE TABLE "${TEMP_SCHEMA}"."equipos" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        codigo TEXT,
        numero_serie TEXT
      );
      CREATE UNIQUE INDEX "equipos_empresa_id_numero_serie_key" 
        ON "${TEMP_SCHEMA}"."equipos"("empresa_id", "numero_serie");
    `);

    console.log('[TEST-SERIE-ROLLBACK] Verificando que la restricción previa rechaza series duplicadas...');
    const testEmpresaId = '11111111-1111-1111-1111-111111111111';
    await pool.query(
      `INSERT INTO "${TEMP_SCHEMA}"."equipos"(empresa_id, codigo, numero_serie) VALUES ($1, $2, $3)`,
      [testEmpresaId, '01-01', 'COMODIN']
    );

    let rejectedPre = false;
    try {
      await pool.query(
        `INSERT INTO "${TEMP_SCHEMA}"."equipos"(empresa_id, codigo, numero_serie) VALUES ($1, $2, $3)`,
        [testEmpresaId, '01-02', 'COMODIN']
      );
    } catch (e) {
      rejectedPre = true;
    }
    if (!rejectedPre) {
      throw new Error('FALLO: Se esperaba que la restricción previa rechazara series duplicadas.');
    }
    console.log('✓ Restricción previa rechaza duplicados correctamente.');

    // 2. Aplicar migration.sql
    console.log('[TEST-SERIE-ROLLBACK] Aplicando migration.sql en esquema aislado...');
    const migrationSql = fs.readFileSync(
      path.resolve(__dirname, '../prisma/migrations/20260924190000_remove_unique_numero_serie_from_equipos/migration.sql'),
      'utf8'
    );
    // Ejecutar con search_path ajustado
    await pool.query(`SET search_path TO "${TEMP_SCHEMA}"; ${migrationSql} RESET search_path;`);

    // 3. Verificar que ahora SÍ acepta series repetidas (ej. COMODIN, AZUL, DE IDA)
    console.log('[TEST-SERIE-ROLLBACK] Verificando inserción de series repetidas...');
    await pool.query(
      `INSERT INTO "${TEMP_SCHEMA}"."equipos"(empresa_id, codigo, numero_serie) VALUES ($1, $2, $3)`,
      [testEmpresaId, '01-02', 'COMODIN']
    );
    console.log('✓ Series repetidas aceptadas exitosamente sin errores de clave única.');

    // 4. Intentar rollback.sql con duplicados existentes: debe abortar por precondición
    console.log('[TEST-SERIE-ROLLBACK] Probando aborto de precondición en rollback.sql...');
    const rollbackSql = fs.readFileSync(
      path.resolve(__dirname, '../prisma/migrations/20260924190000_remove_unique_numero_serie_from_equipos/rollback.sql'),
      'utf8'
    );
    let abortedPrecondition = false;
    try {
      await pool.query(`SET search_path TO "${TEMP_SCHEMA}"; ${rollbackSql} RESET search_path;`);
    } catch (e) {
      if (e.message.includes('No se puede restaurar la restricción de unicidad')) {
        abortedPrecondition = true;
      } else {
        throw e;
      }
    }
    if (!abortedPrecondition) {
      throw new Error('FALLO: rollback.sql debió abortar ante valores duplicados de serie.');
    }
    console.log('✓ Precondición de rollback.sql abortó correctamente protegiendo la integridad.');

    // 5. Eliminar duplicado y probar que el rollback tiene éxito
    console.log('[TEST-SERIE-ROLLBACK] Limpiando duplicado y ejecutando rollback.sql limpio...');
    await pool.query(
      `DELETE FROM "${TEMP_SCHEMA}"."equipos" WHERE codigo = '01-02'`
    );
    await pool.query(`SET search_path TO "${TEMP_SCHEMA}"; ${rollbackSql} RESET search_path;`);
    console.log('✓ rollback.sql ejecutado limpiamente tras remover duplicado.');

    console.log('[TEST-SERIE-ROLLBACK] ✅ PRUEBA DE MIGRACIÓN Y ROLLBACK EXITOSA.');
  } finally {
    console.log(`[TEST-SERIE-ROLLBACK] Limpiando esquema temporal ${TEMP_SCHEMA}...`);
    await pool.query(`DROP SCHEMA IF EXISTS "${TEMP_SCHEMA}" CASCADE`);
    await pool.end();
  }
}

runTest().catch((err) => {
  console.error('❌ Error en test de rollback:', err);
  process.exit(1);
});
