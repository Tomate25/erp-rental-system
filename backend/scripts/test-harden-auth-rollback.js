require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runIsolatedHardenAuthTest() {
  const client = await pool.connect();
  const tempSchema = `test_harden_${Date.now()}`;

  try {
    console.log(`[TEST-MIGRATION] Creando esquema aislado temporal: ${tempSchema}...`);
    await client.query(`CREATE SCHEMA ${tempSchema};`);
    await client.query(`SET search_path TO ${tempSchema};`);

    // 1. Crear tablas simuladas
    await client.query(`
      CREATE TABLE usuarios (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        bloqueado BOOLEAN DEFAULT false,
        intentos_fallidos INT DEFAULT 0
      );
      CREATE TABLE cotizaciones (
        id TEXT PRIMARY KEY,
        token_publico TEXT UNIQUE NOT NULL
      );
    `);

    const migrationPath = path.join(__dirname, '../prisma/migrations/20260923233000_harden_auth_and_public_tokens/migration.sql');
    const rollbackPath = path.join(__dirname, '../prisma/migrations/20260923233000_harden_auth_and_public_tokens/rollback.sql');

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

    // 2. Ejecutar UP
    console.log('[TEST-MIGRATION] Ejecutando UP migration.sql...');
    await client.query(migrationSql);

    // Verificar que las columnas existan
    const colCheckUp1 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = '${tempSchema}' AND table_name = 'usuarios' AND column_name = 'bloqueado_hasta';
    `);
    if (colCheckUp1.rows.length === 0) throw new Error('bloqueado_hasta no fue creada por migration.sql');

    const colCheckUp2 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = '${tempSchema}' AND table_name = 'cotizaciones' AND column_name = 'token_publico_revocado';
    `);
    if (colCheckUp2.rows.length === 0) throw new Error('token_publico_revocado no fue creada por migration.sql');

    console.log('✓ UP validado: columnas creadas correctamente.');

    // 2.5 Verificar que el rollback aborta explícitamente si hay tokens revocados o bloqueos activos
    console.log('[TEST-MIGRATION] Verificando precondiciones de aborto seguro...');
    await client.query(`INSERT INTO cotizaciones (id, token_publico, token_publico_revocado) VALUES ('c1', 'tok-rev', true);`);
    let abortOccurred = false;
    try {
      await client.query(rollbackSql);
    } catch (e) {
      if (e.message.includes('Rollback abortado')) {
        abortOccurred = true;
        console.log('✓ Aborto exitoso ante cotización con token público revocado:', e.message);
      } else {
        throw e;
      }
    }
    if (!abortOccurred) throw new Error('El rollback debió abortar ante token_publico_revocado = true');

    // Limpiar cotización revocada para probar reversión normal
    await client.query(`DELETE FROM cotizaciones WHERE id = 'c1';`);

    // 3. Ejecutar DOWN (Rollback) cuando no hay estados de seguridad activos
    console.log('[TEST-MIGRATION] Ejecutando DOWN rollback.sql sin estados activos...');
    await client.query(rollbackSql);

    const colCheckDown1 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = '${tempSchema}' AND table_name = 'usuarios' AND column_name = 'bloqueado_hasta';
    `);
    if (colCheckDown1.rows.length > 0) throw new Error('bloqueado_hasta sigue existiendo tras rollback');

    const colCheckDown2 = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = '${tempSchema}' AND table_name = 'cotizaciones' AND column_name = 'token_publico_revocado';
    `);
    if (colCheckDown2.rows.length > 0) throw new Error('token_publico_revocado sigue existiendo tras rollback');

    console.log('✓ DOWN validado: columnas eliminadas limpiamente.');
    console.log('--- TEST DE MIGRACIÓN Y ROLLBACK AISLADO COMPLETADO CON ÉXITO ---');
  } finally {
    console.log(`[TEST-MIGRATION] Limpiando esquema aislado temporal: ${tempSchema}...`);
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${tempSchema} CASCADE;`);
      console.log('✓ Esquema temporal eliminado.');
    } finally {
      client.release();
      await pool.end();
    }
  }
}

runIsolatedHardenAuthTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error en prueba aislada de migración:', err);
    process.exit(1);
  });
