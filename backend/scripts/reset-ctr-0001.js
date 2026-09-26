require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetContract() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener id del contrato
    const resCtr = await client.query(
      "SELECT id, codigo, estado FROM contratos WHERE codigo = 'CTR-2026-0001'",
    );
    if (resCtr.rows.length === 0) {
      console.log('No se encontró el contrato CTR-2026-0001');
      await client.query('ROLLBACK');
      return;
    }

    const contratoId = resCtr.rows[0].id;

    // 2. Eliminar cortes de facturación previos (formato anterior)
    const delCortes = await client.query(
      'DELETE FROM cortes_facturacion WHERE contrato_id = $1',
      [contratoId],
    );
    console.log(`Cortes previos eliminados: ${delCortes.rowCount}`);

    // 3. Regresar el estado a SIN_ABRIR y restaurar vigencia inicial
    const updContrato = await client.query(
      `UPDATE contratos
       SET estado = 'SIN_ABRIR',
           fecha_inicio = '2026-09-25 00:00:00',
           fecha_fin = '2026-10-25 00:00:00'
       WHERE id = $1
       RETURNING id, codigo, estado, fecha_inicio, fecha_fin`,
      [contratoId],
    );
    console.log('Contrato reseteado a SIN_ABRIR:', updContrato.rows[0]);

    // 4. Sincronizar reservas del equipo
    await client.query(
      `UPDATE reservas
       SET fecha_inicio = '2026-09-25 00:00:00',
           fecha_fin = '2026-10-25 00:00:00'
       WHERE contrato_id = $1`,
      [contratoId],
    );
    console.log('Reservas sincronizadas');

    await client.query('COMMIT');
    console.log('✅ Éxito: Contrato CTR-2026-0001 regresado al estado SIN_ABRIR sin cortes previos.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al resetear contrato:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetContract();
