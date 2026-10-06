/**
 * Script de importación e ingesta idempotente del catálogo completo de clientes
 * Fuente: C:\Users\abdia\Downloads\clientes_extraidos.json (y .xlsx)
 * Base de datos: PostgreSQL erp_dev
 * Empresa activa: fedb4b05-e281-4956-9367-5a0530976e60 (BM Construcciones / Rental Machinery Nicaragua)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const DEFAULT_EMPRESA_ID = process.env.DEFAULT_EMPRESA_ID || 'fedb4b05-e281-4956-9367-5a0530976e60';
const JSON_PATH = process.env.CLIENTES_JSON_PATH || 'C:/Users/abdia/Downloads/clientes_extraidos.json';

// Mapeo canónico de vendedores a sus usuarios del ERP
const VENDEDOR_MAP = {
  'NYLSKA JOHANNY GARCIA CASTILLO': '4cde6b67-9b72-45b4-8aec-dc755a00cdf6',
  'ARLES DAVID CENTENO': '93d52478-007a-4024-b8e9-328958802724',
  'BISMARK MURILLO': '03e54eb2-5c1e-4b87-8c9e-1d8d48d4f736',
  'YESSEL ANAHY CERPAS ARTOLA': '88c718db-8e77-48c3-91fe-993da3f6440d',
  'AGNEL CASTILLO': 'ad7141c3-7c32-4ae6-842c-e1c18ce06aac',
  "YAHOSKA D'TRINIDAD": 'a3e4c61e-0bc0-4462-beeb-0836c08b3e59',
};

async function main() {
  console.log('======================================================================');
  console.log('🚀 INICIANDO IMPORTACIÓN / ENRIQUECIMIENTO DE CLIENTES EXTRAÍDOS');
  console.log('======================================================================');

  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`Archivo no encontrado: ${JSON_PATH}`);
  }

  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  const clientesData = JSON.parse(raw);
  console.log(`📦 Registros leídos de ${path.basename(JSON_PATH)}: ${clientesData.length}`);

  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:7Hncl05dpakbMWpcoz9JpJJBhrckls4P_C5KPa0Rn3MjOPPaskm8p9yotj1lJics@localhost:5432/erp_dev?schema=public';

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Verificar empresa
    const empRes = await client.query('SELECT id, nombre FROM empresas WHERE id = $1', [DEFAULT_EMPRESA_ID]);
    if (empRes.rows.length === 0) {
      throw new Error(`Empresa con ID ${DEFAULT_EMPRESA_ID} no encontrada en la base de datos.`);
    }
    console.log(`🏢 Empresa destino: [${empRes.rows[0].id}] ${empRes.rows[0].nombre}`);

    // Consultar todos los clientes existentes en la empresa
    const existingRes = await client.query(
      `SELECT id, numero_cliente, rfc, cedula, nombre FROM clientes WHERE empresa_id = $1`,
      [DEFAULT_EMPRESA_ID]
    );

    const existingByNumero = new Map();
    const existingByRfc = new Map();
    const existingByCedula = new Map();

    for (const row of existingRes.rows) {
      if (row.numero_cliente) existingByNumero.set(String(row.numero_cliente).trim(), row);
      if (row.rfc) existingByRfc.set(String(row.rfc).trim(), row);
      if (row.cedula) existingByCedula.set(String(row.cedula).trim(), row);
    }

    console.log(`📊 Clientes preexistentes en la BD para la empresa: ${existingRes.rows.length}`);

    let updatedCount = 0;
    let insertedCount = 0;

    for (const item of clientesData) {
      const idCliente = item['Id Cliente'] ? String(item['Id Cliente']).trim() : null;
      const tipoCliente = item['Tipo de cliente'] ? String(item['Tipo de cliente']).trim() : null;
      const nombreContacto = item['Nombre de contacto'] ? String(item['Nombre de contacto']).trim() : null;
      const empresaNombre = item['Empresa'] ? String(item['Empresa']).trim() : null;
      const nombreOriginal = item['Nombre original'] ? String(item['Nombre original']).trim() : null;
      const cedula = item['Cédula'] ? String(item['Cédula']).trim() : null;
      const rfc = item['RUC'] ? String(item['RUC']).trim() : null;
      const vendedorStr = item['Vendedor'] ? String(item['Vendedor']).trim() : null;
      const direccion = item['Dirección'] ? String(item['Dirección']).trim() : null;
      const departamento = item['Departamento/Ciudad'] ? String(item['Departamento/Ciudad']).trim() : null;
      const correo = item['Correo'] ? String(item['Correo']).trim() : null;
      const telMovistar = item['Teléfono Movistar'] ? String(item['Teléfono Movistar']).trim() : null;
      const telClaro = item['Teléfono Claro'] ? String(item['Teléfono Claro']).trim() : null;
      const telConvencional = item['Teléfono Convencional'] ? String(item['Teléfono Convencional']).trim() : null;
      const rawLimite = item['Límite de crédito'];
      const limiteCredito = rawLimite != null && !isNaN(Number(rawLimite)) ? Number(rawLimite) : null;
      const condicionPago = item['Condición de pago'] ? String(item['Condición de pago']).trim() : null;
      const observaciones = item['Observaciones'] ? String(item['Observaciones']).trim() : null;

      // Nombre de visualización requerido por base de datos
      const nombre =
        nombreOriginal ||
        empresaNombre ||
        nombreContacto ||
        (idCliente ? `Cliente ${idCliente}` : 'Cliente Sin Nombre');

      const razonSocial = empresaNombre || nombreOriginal || null;
      const telefonoPrincipal = telClaro || telMovistar || telConvencional || null;

      // Vendedor ID resolución
      let vendedorId = null;
      if (vendedorStr && VENDEDOR_MAP[vendedorStr]) {
        vendedorId = VENDEDOR_MAP[vendedorStr];
      }

      // Buscar si existe
      let match = null;
      if (idCliente && existingByNumero.has(idCliente)) {
        match = existingByNumero.get(idCliente);
      } else if (rfc && existingByRfc.has(rfc)) {
        match = existingByRfc.get(rfc);
      } else if (cedula && existingByCedula.has(cedula)) {
        match = existingByCedula.get(cedula);
      }

      if (match) {
        // ACTUALIZAR cliente preservando su id y relaciones FK existentes
        await client.query(
          `UPDATE clientes
           SET numero_cliente = $1,
               nombre = $2,
               razon_social = $3,
               rfc = $4,
               cedula = $5,
               direccion = $6,
               email_facturacion = $7,
               telefono = $8,
               tel_movistar = $9,
               tel_claro = $10,
               tel_convencional = $11,
               vendedor = $12,
               vendedor_id = $13,
               limite_credito = $14,
               condicion_pago = $15,
               tipo_cliente = $16,
               nombre_contacto = $17,
               nombre_original = $18,
               departamento = $19,
               observaciones = $20,
               updated_at = NOW()
           WHERE id = $21`,
          [
            idCliente,
            nombre,
            razonSocial,
            rfc,
            cedula,
            direccion,
            correo,
            telefonoPrincipal,
            telMovistar,
            telClaro,
            telConvencional,
            vendedorStr,
            vendedorId,
            limiteCredito,
            condicionPago,
            tipoCliente,
            nombreContacto,
            nombreOriginal,
            departamento,
            observaciones,
            match.id,
          ]
        );
        updatedCount++;
      } else {
        // INSERTAR cliente nuevo
        const newId = crypto.randomUUID();
        await client.query(
          `INSERT INTO clientes (
             id, empresa_id, numero_cliente, nombre, razon_social, rfc, cedula,
             direccion, email_facturacion, telefono, tel_movistar, tel_claro, tel_convencional,
             vendedor, vendedor_id, limite_credito, condicion_pago,
             tipo_cliente, nombre_contacto, nombre_original, departamento, observaciones,
             whatsapp_habilitado, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11, $12, $13,
             $14, $15, $16, $17,
             $18, $19, $20, $21, $22,
             false, NOW(), NOW()
           )`,
          [
            newId,
            DEFAULT_EMPRESA_ID,
            idCliente,
            nombre,
            razonSocial,
            rfc,
            cedula,
            direccion,
            correo,
            telefonoPrincipal,
            telMovistar,
            telClaro,
            telConvencional,
            vendedorStr,
            vendedorId,
            limiteCredito,
            condicionPago,
            tipoCliente,
            nombreContacto,
            nombreOriginal,
            departamento,
            observaciones,
          ]
        );
        insertedCount++;

        // Registrar en los mapas en memoria para evitar colisiones
        if (idCliente) existingByNumero.set(idCliente, { id: newId, numero_cliente: idCliente });
        if (rfc) existingByRfc.set(rfc, { id: newId, rfc });
        if (cedula) existingByCedula.set(cedula, { id: newId, cedula });
      }
    }

    await client.query('COMMIT');
    console.log('✅ TRANSACCIÓN COMPLETADA CON ÉXITO');
    console.log(`   - Clientes actualizados / enriquecidos: ${updatedCount}`);
    console.log(`   - Clientes nuevos insertados:          ${insertedCount}`);
    console.log(`   - Total registros procesados:          ${updatedCount + insertedCount}`);

    // Conteo final en la base de datos
    const finalRes = await client.query(
      `SELECT count(*) as total,
              count(*) filter (where tipo_cliente is not null) as con_tipo,
              count(*) filter (where nombre_contacto is not null) as con_contacto,
              count(*) filter (where departamento is not null) as con_depto,
              count(*) filter (where observaciones is not null) as con_obs,
              count(*) filter (where limite_credito is not null and limite_credito > 0) as con_credito
       FROM clientes WHERE empresa_id = $1`,
      [DEFAULT_EMPRESA_ID]
    );

    console.log('\n📈 ESTADÍSTICAS FINALES EN BASE DE DATOS:');
    console.table(finalRes.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR DURANTE LA IMPORTACIÓN. ROLLBACK EJECUTADO:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
