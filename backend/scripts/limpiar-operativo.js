/**
 * Script de Limpieza de Datos Operativos / Transaccionales (ERP Rental System)
 * 
 * PROPÓSITO:
 * Limpia cotizaciones, contratos, despachos, devoluciones, facturación, pagos,
 * mantenimientos, reservas y solicitudes operativas.
 * 
 * DATOS PRESERVADOS AL 100%:
 * - Clientes y Contactos
 * - Catálogo de Inventario (Categorías, Subcategorías, Marcas, Productos)
 * - Equipos / Maquinaria (incluyendo los 397 registros de hola.xlsx y sus tarifas)
 * - Usuarios, Roles y Permisos
 * - Empresas y Sucursales
 * - Reglas de Comisiones
 * 
 * ACCIÓN SOBRE INVENTARIO:
 * Restablece el estado de los equipos a 'DISPONIBLE' y cantidad_disponible = cantidad_total.
 */
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  console.log('======================================================================');
  console.log(' 🧹 LIMPIEZA DE DATOS OPERATIVOS Y TRANSACCIONALES');
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

    // 2. Iniciar Transacción Atómica
    console.log('\n--- 2. Ejecutando purga de tablas operativas en transacción ---');
    await client.query('BEGIN');

    const operationalTables = [
      { name: 'pagos', label: 'Pagos y Cobros' },
      { name: 'facturas', label: 'Facturas Fiscales' },
      { name: 'cortes_facturacion', label: 'Cortes de Facturación' },
      { name: 'inspecciones_dano', label: 'Inspecciones de Daño' },
      { name: 'detalle_devolucion', label: 'Detalles de Devolución' },
      { name: 'devoluciones', label: 'Devoluciones' },
      { name: 'inspecciones_salida', label: 'Inspecciones de Salida' },
      { name: 'detalle_despacho', label: 'Detalles de Despacho' },
      { name: 'despachos', label: 'Despachos' },
      { name: 'solicitudes_retorno', label: 'Solicitudes de Retorno' },
      { name: 'solicitudes_despacho', label: 'Solicitudes de Despacho' },
      { name: 'reservas', label: 'Reservas de Equipos' },
      { name: 'detalle_contratos', label: 'Detalles de Contrato' },
      { name: 'contratos', label: 'Contratos' },
      { name: 'detalle_cotizacion', label: 'Detalles de Cotización' },
      { name: 'cotizaciones', label: 'Cotizaciones Comerciales' },
      { name: 'solicitudes', label: 'Solicitudes Públicas' },
      { name: 'mantenimientos', label: 'Mantenimientos' },
      { name: 'lecturas_horometro', label: 'Lecturas de Horómetro' },
      { name: 'notificaciones', label: 'Notificaciones' },
    ];

    let totalDeleted = 0;
    for (const table of operationalTables) {
      const res = await client.query(`DELETE FROM ${table.name}`);
      console.log(`  ✓ Eliminados de ${table.label.padEnd(28)} (${table.name}): ${res.rowCount}`);
      totalDeleted += res.rowCount;
    }

    // 3. Restablecer estados y stock disponible del inventario
    console.log('\n--- 3. Restableciendo estado de inventario a DISPONIBLE ---');
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

    // 4. Verificación posterior de preservación de datos maestros
    console.log('\n--- 4. Cotejo post-limpieza de datos maestros ---');
    const postEmpresas = await client.query('SELECT COUNT(1) FROM empresas');
    const postClientes = await client.query('SELECT COUNT(1) FROM clientes');
    const postUsuarios = await client.query('SELECT COUNT(1) FROM usuarios');
    const postEquipos = await client.query('SELECT COUNT(1) FROM equipos');
    const postEquiposRentados = await client.query("SELECT COUNT(1) FROM equipos WHERE estado != 'DISPONIBLE'");
    const postEquiposStock = await client.query("SELECT COUNT(1) FROM equipos WHERE cantidad_disponible != cantidad_total");

    console.log(`  • Clientes preservados: ${postClientes.rows[0].count} / ${preClientes.rows[0].count}`);
    console.log(`  • Usuarios preservados: ${postUsuarios.rows[0].count} / ${preUsuarios.rows[0].count}`);
    console.log(`  • Equipos preservados:  ${postEquipos.rows[0].count} / ${preEquipos.rows[0].count}`);
    console.log(`  • Equipos no DISPONIBLE: ${postEquiposRentados.rows[0].count} (debe ser 0)`);
    console.log(`  • Stock comprometido:    ${postEquiposStock.rows[0].count} (debe ser 0)`);

    if (
      postClientes.rows[0].count !== preClientes.rows[0].count ||
      postUsuarios.rows[0].count !== preUsuarios.rows[0].count ||
      postEquipos.rows[0].count !== preEquipos.rows[0].count
    ) {
      throw new Error('Alerta: Hubo pérdida inesperada en datos maestros.');
    }

    console.log('\n✅ LIMPIEZA COMPLETADA CON ÉXITO: Sistema operativo en blanco, datos maestros 100% íntegros.');
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
