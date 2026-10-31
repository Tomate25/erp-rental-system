/**
 * Script de Limpieza de Datos Operativos / Transaccionales (ERP Rental System)
 * 
 * PROPÓSITO:
 * Limpia cotizaciones, contratos, despachos, devoluciones, facturación, pagos,
 * CxC, contabilidad, nóminas, mantenimientos, reservas y solicitudes operativas.
 * 
 * DATOS PRESERVADOS AL 100%:
 * - Clientes y Contactos
 * - Catálogo de Inventario (Categorías, Subcategorías, Marcas, Productos)
 * - Equipos / Maquinaria (incluyendo los 278/397 registros y sus tarifas)
 * - Usuarios, Roles y Permisos
 * - Empresas y Sucursales
 * - Series y Folios (definiciones de series activas)
 * - Parámetros de nómina y reglas de comisiones
 * 
 * ACCIÓN SOBRE INVENTARIO Y SERIES:
 * Restablece el estado de los equipos a 'DISPONIBLE' y cantidad_disponible = cantidad_total.
 * Restablece numero_actual = 0 en series_documento y limpia series_documento_uso.
 */
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  console.log('======================================================================');
  console.log(' 🧹 LIMPIEZA DE DATOS OPERATIVOS Y TRANSACCIONALES (PRODUCCIÓN)');
  console.log('======================================================================\n');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. Snapshot previo de datos importantes a preservar
    console.log('--- 1. Verificando integridad de datos maestros (A PRESERVAR) ---');
    const preEmpresas = await client.query('SELECT COUNT(1) FROM empresas');
    const preSucursales = await client.query('SELECT COUNT(1) FROM sucursales');
    const preUsuarios = await client.query('SELECT COUNT(1) FROM usuarios');
    const preRoles = await client.query('SELECT COUNT(1) FROM roles');
    const preClientes = await client.query('SELECT COUNT(1) FROM clientes');
    const preContactos = await client.query('SELECT COUNT(1) FROM contactos_cliente');
    const preCategorias = await client.query('SELECT COUNT(1) FROM categorias');
    const preMarcas = await client.query('SELECT COUNT(1) FROM marcas');
    const preProductos = await client.query('SELECT COUNT(1) FROM productos');
    const preEquipos = await client.query('SELECT COUNT(1) FROM equipos');
    const preReglas = await client.query('SELECT COUNT(1) FROM reglas_comision');
    const preSeries = await client.query('SELECT COUNT(1) FROM series_documento');

    console.log(`  • Empresas:          ${preEmpresas.rows[0].count}`);
    console.log(`  • Sucursales:        ${preSucursales.rows[0].count}`);
    console.log(`  • Usuarios:          ${preUsuarios.rows[0].count}`);
    console.log(`  • Roles:             ${preRoles.rows[0].count}`);
    console.log(`  • Clientes:          ${preClientes.rows[0].count}`);
    console.log(`  • Contactos Cliente: ${preContactos.rows[0].count}`);
    console.log(`  • Categorías:        ${preCategorias.rows[0].count}`);
    console.log(`  • Marcas:            ${preMarcas.rows[0].count}`);
    console.log(`  • Productos:         ${preProductos.rows[0].count}`);
    console.log(`  • Equipos Físicos:   ${preEquipos.rows[0].count}`);
    console.log(`  • Reglas Comisión:   ${preReglas.rows[0].count}`);
    console.log(`  • Series Documento:  ${preSeries.rows[0].count}`);

    // 2. Iniciar Transacción Atómica
    console.log('\n--- 2. Ejecutando purga de tablas operativas en transacción ---');
    await client.query('BEGIN');

    const operationalTables = [
      // CxC y Pagos
      { name: 'recibo_caja_aplicaciones', label: 'Aplicaciones Recibo Caja' },
      { name: 'recibos_caja', label: 'Recibos de Caja' },
      { name: 'notas_debito', label: 'Notas de Débito' },
      { name: 'arreglo_pago_cuotas', label: 'Cuotas Arreglo Pago' },
      { name: 'arreglo_pago_documentos', label: 'Docs Arreglo Pago' },
      { name: 'arreglos_pago', label: 'Arreglos de Pago' },
      { name: 'anticipos_clientes', label: 'Anticipos de Clientes' },
      { name: 'asientos_lineas', label: 'Líneas Asientos Contables' },
      { name: 'asientos_contables', label: 'Asientos Contables' },
      { name: 'pagos', label: 'Pagos y Cobros' },
      { name: 'facturas', label: 'Facturas Fiscales' },
      { name: 'cortes_facturacion', label: 'Cortes de Facturación' },
      
      // Devoluciones, Daños y Despachos
      { name: 'liquidaciones_retorno', label: 'Liquidaciones de Retorno' },
      { name: 'inspecciones_dano', label: 'Inspecciones de Daño' },
      { name: 'detalle_devolucion', label: 'Detalles de Devolución' },
      { name: 'devoluciones', label: 'Devoluciones' },
      { name: 'inspecciones_salida', label: 'Inspecciones de Salida' },
      { name: 'detalle_despacho', label: 'Detalles de Despacho' },
      { name: 'despachos', label: 'Despachos' },
      { name: 'solicitudes_retorno', label: 'Solicitudes de Retorno' },
      { name: 'solicitudes_despacho', label: 'Solicitudes de Despacho' },

      // Reservas, Contratos y Cotizaciones
      { name: 'reservas', label: 'Reservas de Equipos' },
      { name: 'detalle_contratos', label: 'Detalles de Contrato' },
      { name: 'contratos', label: 'Contratos' },
      { name: 'detalle_cotizacion', label: 'Detalles de Cotización' },
      { name: 'cotizaciones', label: 'Cotizaciones Comerciales' },
      { name: 'solicitudes', label: 'Solicitudes Públicas' },
      { name: 'mantenimientos', label: 'Mantenimientos' },
      { name: 'lecturas_horometro', label: 'Lecturas de Horómetro' },
      { name: 'notificaciones', label: 'Notificaciones' },

      // Nóminas y Comisiones Demo
      { name: 'planillas_bitacora', label: 'Bitácora de Planillas' },
      { name: 'planillas_lineas', label: 'Líneas de Planilla' },
      { name: 'planillas_empleado', label: 'Empleados de Planilla' },
      { name: 'planillas', label: 'Planillas de Nómina' },
      { name: 'novedades_nomina', label: 'Novedades de Nómina' },
      { name: 'liquidaciones_finales', label: 'Liquidaciones Finales' },
      { name: 'liquidaciones_comision_documentos', label: 'Docs Liq Comisión' },
      { name: 'liquidaciones_comision_tramos', label: 'Tramos Liq Comisión' },
      { name: 'liquidaciones_comision', label: 'Liquidaciones de Comisión' },
      { name: 'ajustes_comision', label: 'Ajustes de Comisión' },
      { name: 'saldos_arrastre_comision', label: 'Saldos Arrastre Comisión' },

      // Series y Folios Bitácora de Uso
      { name: 'series_documento_uso', label: 'Uso de Series y Folios' },
    ];

    let totalDeleted = 0;
    for (const table of operationalTables) {
      try {
        const res = await client.query(`DELETE FROM ${table.name}`);
        console.log(`  ✓ Eliminados de ${table.label.padEnd(30)} (${table.name}): ${res.rowCount}`);
        totalDeleted += res.rowCount;
      } catch (err) {
        if (err.code === '42P01') {
          // Tabla no existe en este ambiente, continuar
          console.log(`  - Tabla ${table.name} no existe, omitida`);
        } else {
          throw err;
        }
      }
    }

    // 3. Reiniciar contadores de series a 0
    console.log('\n--- 3. Reiniciando contadores de Series y Folios ---');
    const updateSeries = await client.query(`
      UPDATE series_documento
      SET numero_actual = 0,
          estado = 'ACTIVA',
          updated_at = NOW()
    `);
    console.log(`  ✓ Series reiniciadas a número 0: ${updateSeries.rowCount}`);

    // 4. Restablecer estados y stock disponible del inventario
    console.log('\n--- 4. Restableciendo estado de inventario a DISPONIBLE y stock 100% ---');
    const updateEquipos = await client.query(`
      UPDATE equipos 
      SET estado = 'DISPONIBLE',
          cantidad_disponible = cantidad_total,
          updated_at = NOW()
      WHERE estado != 'DISPONIBLE' OR cantidad_disponible != cantidad_total
    `);
    console.log(`  ✓ Equipos restablecidos a DISPONIBLE y stock completo: ${updateEquipos.rowCount}`);

    await client.query('COMMIT');
    console.log(`\n✓ Transacción confirmada. Total registros operativos eliminados: ${totalDeleted}`);

    // 5. Verificación posterior de preservación de datos maestros
    console.log('\n--- 5. Cotejo post-limpieza de datos maestros ---');
    const postEmpresas = await client.query('SELECT COUNT(1) FROM empresas');
    const postClientes = await client.query('SELECT COUNT(1) FROM clientes');
    const postUsuarios = await client.query('SELECT COUNT(1) FROM usuarios');
    const postEquipos = await client.query('SELECT COUNT(1) FROM equipos');
    const postEquiposRentados = await client.query("SELECT COUNT(1) FROM equipos WHERE estado != 'DISPONIBLE'");
    const postEquiposStock = await client.query("SELECT COUNT(1) FROM equipos WHERE cantidad_disponible != cantidad_total");
    const postCotizaciones = await client.query('SELECT COUNT(1) FROM cotizaciones');
    const postContratos = await client.query('SELECT COUNT(1) FROM contratos');
    const postFacturas = await client.query('SELECT COUNT(1) FROM facturas');
    const postReservas = await client.query('SELECT COUNT(1) FROM reservas');

    console.log(`  • Clientes preservados:   ${postClientes.rows[0].count} / ${preClientes.rows[0].count}`);
    console.log(`  • Usuarios preservados:   ${postUsuarios.rows[0].count} / ${preUsuarios.rows[0].count}`);
    console.log(`  • Equipos preservados:    ${postEquipos.rows[0].count} / ${preEquipos.rows[0].count}`);
    console.log(`  • Equipos no DISPONIBLE:  ${postEquiposRentados.rows[0].count} (debe ser 0)`);
    console.log(`  • Stock comprometido:      ${postEquiposStock.rows[0].count} (debe ser 0)`);
    console.log(`  • Cotizaciones restantes: ${postCotizaciones.rows[0].count} (debe ser 0)`);
    console.log(`  • Contratos restantes:    ${postContratos.rows[0].count} (debe ser 0)`);
    console.log(`  • Facturas restantes:     ${postFacturas.rows[0].count} (debe ser 0)`);
    console.log(`  • Reservas restantes:     ${postReservas.rows[0].count} (debe ser 0)`);

    if (
      postClientes.rows[0].count !== preClientes.rows[0].count ||
      postUsuarios.rows[0].count !== preUsuarios.rows[0].count ||
      postEquipos.rows[0].count !== preEquipos.rows[0].count
    ) {
      throw new Error('Alerta: Hubo pérdida inesperada en datos maestros.');
    }

    console.log('\n✅ LIMPIEZA COMPLETADA CON ÉXITO: Base de datos de producción 100% limpia y lista.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
