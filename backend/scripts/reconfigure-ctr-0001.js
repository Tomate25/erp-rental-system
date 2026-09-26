require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cRes = await client.query("SELECT id, codigo, fecha_inicio, fecha_fin, cotizacion_id FROM contratos WHERE codigo = 'CTR-2026-0001'");
    if (cRes.rows.length === 0) {
      console.log('Contrato CTR-2026-0001 no encontrado');
      return;
    }
    const contrato = cRes.rows[0];
    const cotRes = await client.query("SELECT total FROM cotizaciones WHERE id = $1", [contrato.cotizacion_id]);
    const totalAmount = parseFloat(cotRes.rows[0].total); // 2317.25

    console.log(`Contrato ${contrato.codigo} - Total Cotización: C$ ${totalAmount}`);

    // Eliminar cortes pendientes anteriores (el corte único de 2317.25)
    await client.query("DELETE FROM cortes_facturacion WHERE contrato_id = $1 AND estado = 'PENDIENTE'", [contrato.id]);

    const cantidadCortes = 4;
    const periodoDias = 20;

    const totalCentavos = Math.round(totalAmount * 100);
    const baseCentavos = Math.floor(totalCentavos / cantidadCortes);
    let remCentavos = totalCentavos - (baseCentavos * cantidadCortes);

    let inicio = new Date(contrato.fecha_inicio);
    let maxFechaFin = new Date(inicio);

    for (let i = 1; i <= cantidadCortes; i++) {
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + periodoDias);

      const centavos = baseCentavos + (remCentavos > 0 ? 1 : 0);
      if (remCentavos > 0) remCentavos--;
      const monto = (centavos / 100).toFixed(2);

      await client.query(`
        INSERT INTO cortes_facturacion (id, contrato_id, numero_corte, fecha_inicio, fecha_fin, monto, estado, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'PENDIENTE', NOW(), NOW())
      `, [contrato.id, i, inicio, fin, monto]);

      console.log(`  Corte #${i}: ${inicio.toLocaleDateString('es-NI')} -> ${fin.toLocaleDateString('es-NI')} | Monto: C$ ${monto}`);

      inicio = new Date(fin);
      maxFechaFin = fin;
    }

    // Actualizar fecha_fin del contrato a la fecha del último corte
    await client.query("UPDATE contratos SET fecha_fin = $1 WHERE id = $2", [maxFechaFin, contrato.id]);
    console.log(`Contrato actualizado con nueva fecha fin: ${maxFechaFin.toLocaleDateString('es-NI')}`);

    await client.query('COMMIT');
    console.log('¡Transacción completada exitosamente!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
