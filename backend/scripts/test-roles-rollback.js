require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runIsolatedRollbackTest() {
  const client = await pool.connect();
  const tempSchema = `test_temp_roles_${Date.now()}`;

  try {
    console.log(`[TEST-ROLLBACK] Creando esquema aislado temporal: ${tempSchema}...`);
    await client.query(`CREATE SCHEMA ${tempSchema};`);
    await client.query(`SET search_path TO ${tempSchema};`);

    // 1. Crear estructura simulada idéntica a producción post-migración
    console.log('[TEST-ROLLBACK] Creando tablas e índices simulados en esquema aislado...');
    await client.query(`
      CREATE TABLE empresas (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL
      );
      CREATE TABLE roles (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        empresa_id TEXT REFERENCES empresas(id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX "roles_empresa_id_nombre_key" ON "roles"("empresa_id", "nombre");
      CREATE UNIQUE INDEX "roles_nombre_null_empresa_key" ON "roles"("nombre") WHERE ("empresa_id" IS NULL);
    `);

    // Insertar empresas de prueba y roles globales
    await client.query(`
      INSERT INTO empresas (id, nombre) VALUES ('emp-1', 'Empresa 1'), ('emp-2', 'Empresa 2');
      INSERT INTO roles (id, nombre, empresa_id) VALUES 
        ('r-admin', 'ADMIN', NULL),
        ('r-gerente', 'GERENTE', NULL);
    `);

    // Leer el contenido real de rollback.sql
    const rollbackPath = path.join(__dirname, '../prisma/migrations/20260923223000_add_empresa_id_to_roles/rollback.sql');
    const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

    // TEST CASO 1: Aborto seguro cuando existen roles personalizados de empresas
    console.log('[TEST-ROLLBACK] Caso 1: Insertando rol de empresa y verificando aborto seguro...');
    await client.query(`
      INSERT INTO roles (id, nombre, empresa_id) VALUES ('r-tenant', 'SUPERVISOR_LOCAL', 'emp-1');
    `);

    let didAbort = false;
    try {
      await client.query(rollbackSql);
    } catch (err) {
      if (err.message && err.message.includes('ABORTANDO ROLLBACK')) {
        didAbort = true;
        console.log(`✓ Caso 1 superado: rollback abortó correctamente con mensaje esperado: "${err.message.trim()}"`);
      } else {
        throw new Error(`Caso 1 falló con error inesperado: ${err.message}`);
      }
    }

    if (!didAbort) {
      throw new Error('FALLO CRÍTICO: El rollback NO abortó a pesar de existir roles personalizados asociados a tenants.');
    }

    // TEST CASO 2: Ejecución exitosa de rollback cuando solo existen roles globales del sistema
    console.log('[TEST-ROLLBACK] Caso 2: Removiendo roles de tenant y ejecutando rollback en roles globales...');
    await client.query(`DELETE FROM roles WHERE empresa_id IS NOT NULL;`);

    // Ejecutar rollback.sql
    await client.query(rollbackSql);
    console.log('✓ Caso 2: rollback.sql ejecutado sin errores.');

    // Verificar que la columna empresa_id fue eliminada y que roles_nombre_key existe
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = '${tempSchema}' AND table_name = 'roles' AND column_name = 'empresa_id';
    `);
    if (colCheck.rows.length !== 0) {
      throw new Error('FALLO CRÍTICO: La columna empresa_id sigue existiendo tras el rollback.');
    }

    const idxCheck = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = '${tempSchema}' AND tablename = 'roles' AND indexname = 'roles_nombre_key';
    `);
    if (idxCheck.rows.length === 0) {
      throw new Error('FALLO CRÍTICO: El índice roles_nombre_key no fue restaurado.');
    }

    console.log('✓ Caso 2 superado: columna empresa_id eliminada y roles_nombre_key restaurado.');
    console.log('--- TODOS LOS CASOS DE ROLLBACK AISLADO FUERON SUPERADOS EXITOSAMENTE ---');
  } finally {
    console.log(`[TEST-ROLLBACK] Limpiando esquema aislado temporal: ${tempSchema}...`);
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${tempSchema} CASCADE;`);
      console.log('✓ Esquema temporal eliminado.');
    } catch (cleanupErr) {
      console.error('Error al limpiar esquema temporal:', cleanupErr);
    }
    client.release();
    await pool.end();
  }
}

runIsolatedRollbackTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('ERROR EN PRUEBA DE ROLLBACK:', err);
    process.exit(1);
  });
