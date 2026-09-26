/**
 * Script de Importación Canónica e Idempotente de Inventario: hola.xlsx (TAREA-DAT-001)
 * Fuente: inventario_hola_exacto.json (397 registros canónicos)
 * Tenant: fedb4b05-e281-4956-9367-5a0530976e60 (Rental Machinery Nicaragua S.A.)
 *
 * Reglas de Fidelidad:
 * - NO recortar ni normalizar descripciones (preserva espacios literales).
 * - NO inventar sufijos para series repetidas (COMODIN, AZUL, DE IDA, etc. se guardan literales).
 * - Mapear Precio -> precioRentaDia (Decimal), precioRentaHora = null, modalidadRenta = SOLO_DIA.
 * - Cero deleteMany(): actualización atómica e idempotente dentro de transacción SQL.
 * - Verificación round-trip automática al 100%.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const CANONICAL_JSON_PATH = path.resolve(
  'C:/Users/abdia/OneDrive/Desktop/BismarkObsi/BismarkObsi/04_DOCUMENTACION_SISTEMA/15_IMPORTACION_INVENTARIO_HOLA/inventario_hola_exacto.json'
);

const TARGET_EMPRESA_ID = 'fedb4b05-e281-4956-9367-5a0530976e60';

const CATEGORIA_PREFIX_MAP = {
  '01': 'COMPACTACION',
  '02': 'CONCRETO Y FORMALETAS',
  '03': 'GENERADORES E ILUMINACION',
  '04': 'BOMBAS E HIDROLAVADORAS',
  '05': 'DEMOLICION Y PERFORACION',
  '06': 'ANDAMIOS Y SEGURIDAD',
  '07': 'VEHICULOS Y TRANSPORTE',
  '08': 'MAQUINARIA PESADA',
};

async function main() {
  console.log('======================================================================');
  console.log(' 🚀 IMPORTACIÓN FIDEDIGNA DE INVENTARIO: hola.xlsx (TAREA-DAT-001)');
  console.log('======================================================================\n');

  if (!fs.existsSync(CANONICAL_JSON_PATH)) {
    throw new Error(`Archivo canónico no encontrado en: ${CANONICAL_JSON_PATH}`);
  }

  const raw = fs.readFileSync(CANONICAL_JSON_PATH, 'utf8');
  const canonicalData = JSON.parse(raw);
  const records = canonicalData.records || [];

  if (records.length !== 397) {
    throw new Error(`El archivo canónico debe contener exactamente 397 registros, encontrados: ${records.length}`);
  }
  console.log(`✓ Archivo canónico validado: 397 registros.`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. Validar existencia del Tenant Destino y su Sucursal Central
    const empRes = await client.query('SELECT id, nombre FROM empresas WHERE id = $1', [TARGET_EMPRESA_ID]);
    if (empRes.rows.length === 0) {
      throw new Error(`Tenant destino ${TARGET_EMPRESA_ID} no existe.`);
    }
    console.log(`✓ Tenant validado: ${empRes.rows[0].nombre} (${TARGET_EMPRESA_ID})`);

    const sucRes = await client.query(
      'SELECT id, nombre FROM sucursales WHERE empresa_id = $1 ORDER BY created_at ASC LIMIT 1',
      [TARGET_EMPRESA_ID]
    );
    if (sucRes.rows.length === 0) {
      throw new Error(`No se encontró sucursal para la empresa ${TARGET_EMPRESA_ID}`);
    }
    const targetSucursalId = sucRes.rows[0].id;
    console.log(`✓ Sucursal central: ${sucRes.rows[0].nombre} (${targetSucursalId})`);

    // 2. Precargar y mapear Categorías
    const catsRes = await client.query('SELECT id, nombre FROM categorias');
    const catMap = new Map();
    for (const c of catsRes.rows) {
      catMap.set(c.nombre.toUpperCase().trim(), c.id);
    }

    // Asegurar que las 8 categorías requeridas existan
    for (const [prefix, catName] of Object.entries(CATEGORIA_PREFIX_MAP)) {
      if (!catMap.has(catName.toUpperCase())) {
        const insertCat = await client.query(
          'INSERT INTO categorias(id, nombre) VALUES (gen_random_uuid(), $1) RETURNING id',
          [catName]
        );
        catMap.set(catName.toUpperCase(), insertCat.rows[0].id);
        console.log(`+ Creada categoría faltante: ${catName}`);
      }
    }

    // 3. Precargar Marcas
    const brandsRes = await client.query('SELECT id, nombre FROM marcas');
    const brandMap = new Map();
    for (const b of brandsRes.rows) {
      brandMap.set(b.nombre.toUpperCase().trim(), b.id);
    }

    // Marca por defecto si no se detecta en la descripción
    let defaultBrandId = brandMap.get('GENERICA') || brandMap.get('N/D');
    if (!defaultBrandId) {
      const insBrand = await client.query(
        'INSERT INTO marcas(id, nombre) VALUES (gen_random_uuid(), $1) RETURNING id',
        ['N/D']
      );
      defaultBrandId = insBrand.rows[0].id;
      brandMap.set('N/D', defaultBrandId);
    }

    // Helper para resolver marca desde el texto de la descripción
    function resolveMarcaId(descripcion) {
      const upper = descripcion.toUpperCase();
      for (const [bName, bId] of brandMap.entries()) {
        if (bName.length >= 3 && upper.includes(bName)) {
          return bId;
        }
      }
      return defaultBrandId;
    }

    // 4. Iniciar Transacción Atómica
    console.log('\n--- Ejecutando carga idempotente en transacción SQL ---');
    await client.query('BEGIN');

    let totalUpdated = 0;
    let totalCreated = 0;

    for (const r of records) {
      const prefix = r.articulo.split('-')[0];
      const catName = CATEGORIA_PREFIX_MAP[prefix] || 'MAQUINARIA PESADA';
      const categoriaId = catMap.get(catName.toUpperCase());
      const marcaId = resolveMarcaId(r.descripcion);
      const numeroSerie = r.serie && r.serie !== '' ? r.serie : null;

      // Buscar si ya existe el equipo por (empresa_id, codigo)
      const existing = await client.query(
        'SELECT id FROM equipos WHERE empresa_id = $1 AND codigo = $2',
        [TARGET_EMPRESA_ID, r.articulo]
      );

      if (existing.rows.length > 0) {
        // Actualizar registro existente restaurando fidelidad exacta
        await client.query(
          `UPDATE equipos
           SET descripcion = $1,
               precio_renta_dia = $2,
               precio_renta_hora = NULL,
               modalidad_renta = 'SOLO_DIA',
               numero_serie = $3,
               categoria_id = COALESCE(categoria_id, $4),
               updated_at = NOW()
           WHERE id = $5`,
          [r.descripcion, r.precio, numeroSerie, categoriaId, existing.rows[0].id]
        );
        totalUpdated++;
      } else {
        // Crear nuevo registro
        await client.query(
          `INSERT INTO equipos (
             id, empresa_id, sucursal_id, categoria_id, marca_id,
             codigo, modelo, numero_serie, descripcion,
             precio_renta_dia, precio_renta_hora, modalidad_renta,
             tipo_control, estado, cantidad_total, cantidad_disponible,
             horometro, horometro_ultimo_servicio, intervalo_servicio_horas,
             created_at, updated_at
           ) VALUES (
             gen_random_uuid(), $1, $2, $3, $4,
             $5, 'S/M', $6, $7,
             $8, NULL, 'SOLO_DIA',
             'SERIALIZADO', 'DISPONIBLE', 1, 1,
             0.0, 0.0, 250.0,
             NOW(), NOW()
           )`,
          [
            TARGET_EMPRESA_ID,
            targetSucursalId,
            categoriaId,
            marcaId,
            r.articulo,
            numeroSerie,
            r.descripcion,
            r.precio,
          ]
        );
        totalCreated++;
      }
    }

    await client.query('COMMIT');
    console.log(`✓ Transacción confirmada:`);
    console.log(`  - Equipos existentes actualizados fielmente: ${totalUpdated}`);
    console.log(`  - Nuevos equipos creados fielmente: ${totalCreated}`);
    console.log(`  - Total artículos procesados: ${totalUpdated + totalCreated} / 397`);

    // 5. Verificación Exhaustiva de Round-Trip
    console.log('\n--- Verificando fidelidad Round-Trip (PostgreSQL -> Canonico) ---');
    const verifyRes = await client.query(
      `SELECT codigo, descripcion, precio_renta_dia, precio_renta_hora, modalidad_renta, numero_serie
       FROM equipos
       WHERE empresa_id = $1 AND codigo = ANY($2::text[])
       ORDER BY codigo ASC`,
      [TARGET_EMPRESA_ID, records.map((r) => r.articulo)]
    );

    const dbMap = new Map();
    for (const row of verifyRes.rows) {
      dbMap.set(row.codigo, row);
    }

    if (dbMap.size !== 397) {
      throw new Error(`Round-trip fallido: Se esperaban 397 artículos en BD, se obtuvieron ${dbMap.size}`);
    }

    let diffCount = 0;
    for (const r of records) {
      const dbRow = dbMap.get(r.articulo);
      if (!dbRow) {
        console.error(`❌ Artículo faltante en BD: ${r.articulo}`);
        diffCount++;
        continue;
      }

      // 1. Artículo
      if (dbRow.codigo !== r.articulo) {
        console.error(`❌ Discrepancia en Artículo: ${dbRow.codigo} !== ${r.articulo}`);
        diffCount++;
      }

      // 2. Descripción literal
      if (dbRow.descripcion !== r.descripcion) {
        console.error(`❌ Discrepancia en Descripción para ${r.articulo}:`);
        console.error(`   BD:     "${dbRow.descripcion}"`);
        console.error(`   Fuente: "${r.descripcion}"`);
        diffCount++;
      }

      // 3. Precio
      const dbPrecio = Number(dbRow.precio_renta_dia);
      if (dbPrecio !== Number(r.precio)) {
        console.error(`❌ Discrepancia en Precio para ${r.articulo}: ${dbPrecio} !== ${r.precio}`);
        diffCount++;
      }

      // 4. Serie literal
      const expectedSerie = r.serie && r.serie !== '' ? r.serie : null;
      if (dbRow.numero_serie !== expectedSerie) {
        console.error(`❌ Discrepancia en Serie para ${r.articulo}:`);
        console.error(`   BD:     "${dbRow.numero_serie}"`);
        console.error(`   Fuente: "${expectedSerie}"`);
        diffCount++;
      }

      // 5. Modalidad y precio hora
      if (dbRow.precio_renta_hora !== null) {
        console.error(`❌ precio_renta_hora debe ser NULL para ${r.articulo}, valor: ${dbRow.precio_renta_hora}`);
        diffCount++;
      }
      if (dbRow.modalidad_renta !== 'SOLO_DIA') {
        console.error(`❌ modalidad_renta debe ser 'SOLO_DIA' para ${r.articulo}, valor: ${dbRow.modalidad_renta}`);
        diffCount++;
      }
    }

    if (diffCount > 0) {
      throw new Error(`Round-trip falló con ${diffCount} discrepancias.`);
    }

    console.log('✅ ROUND-TRIP APROBADO AL 100%: 397/397 registros cotejados con cero diferencias.');
    console.log('✅ TAREA-DAT-001 COMPLETADA EXITOSAMENTE.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error en importación:', error);
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
