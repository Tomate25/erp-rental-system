require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runIsolatedRollbackTest() {
  const client = await pool.connect();
  const tempSchema = `test_temp_auditoria_${Date.now()}`;

  try {
    console.log(`[TEST-ROLLBACK] Creando esquema aislado temporal: ${tempSchema}...`);
    await client.query(`CREATE SCHEMA ${tempSchema};`);
    await client.query(`SET search_path TO ${tempSchema};`);

    // 1. Crear estructura simulada post-migración
    console.log('[TEST-ROLLBACK] Creando tablas e índices de auditoría en esquema aislado...');
    await client.query(`
      CREATE TABLE empresas (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL
      );
      CREATE TABLE usuarios (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL
      );
      CREATE TABLE auditorias (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
        usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
        accion TEXT NOT NULL,
        entidad_tipo TEXT NOT NULL,
        entidad_id TEXT NOT NULL,
        detalles TEXT NOT NULL,
        ip_direccion TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        request_id TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "auditorias_empresa_id_created_at_idx" ON "auditorias"("empresa_id", "created_at");
      CREATE INDEX "auditorias_empresa_id_entidad_tipo_entidad_id_idx" ON "auditorias"("empresa_id", "entidad_tipo", "entidad_id");
      CREATE INDEX "auditorias_empresa_id_usuario_id_idx" ON "auditorias"("empresa_id", "usuario_id");
      CREATE INDEX "auditorias_request_id_idx" ON "auditorias"("request_id");
    `);

    // 2. Insertar registros
    await client.query(`
      INSERT INTO empresas (id, nombre) VALUES ('emp-1', 'Empresa 1');
      INSERT INTO usuarios (id, email) VALUES ('usr-1', 'admin@emp1.com');
      INSERT INTO auditorias (id, empresa_id, usuario_id, accion, entidad_tipo, entidad_id, detalles, ip_direccion, user_agent, request_id)
      VALUES ('aud-1', 'emp-1', 'usr-1', 'CREAR', 'CLIENTE', 'cli-1', '{"nombre":"Test"}', '127.0.0.1', 'Jest/Test', 'req-123');
    `);

    // 3. Leer y ejecutar rollback.sql
    const rollbackPath = path.join(
      __dirname,
      '../prisma/migrations/20260924010000_add_empresa_and_indices_to_auditoria/rollback.sql',
    );
    const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

    console.log('[TEST-ROLLBACK] Ejecutando rollback.sql...');
    await client.query(rollbackSql);
    console.log('✓ rollback.sql ejecutado exitosamente.');

    // 4. Verificar que las columnas empresa_id y request_id ya no existen
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = '${tempSchema}' AND table_name = 'auditorias' AND column_name IN ('empresa_id', 'request_id');
    `);

    if (colCheck.rows.length > 0) {
      throw new Error(`Las columnas no fueron eliminadas: ${JSON.stringify(colCheck.rows)}`);
    }

    console.log('✓ Verificación de columnas eliminadas exitosa.');
    console.log('✓ TEST DE ROLLBACK DE AUDITORIA COMPLETADO SATISFACTORIAMENTE.');
  } finally {
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${tempSchema}" CASCADE;`);
    } finally {
      client.release();
      await pool.end();
    }
  }
}

runIsolatedRollbackTest().catch((err) => {
  console.error('Error en prueba de rollback:', err);
  process.exit(1);
});
