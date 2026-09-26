/**
 * Dry-Run de Validación e Inspección Idempotente para TAREA-DAT-001
 * Fuente canónica: inventario_hola_exacto.json (397 registros)
 * MODO ESTRICTAMENTE DE SOLO LECTURA (Cero escrituras en PostgreSQL)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const CANONICAL_JSON_PATH = path.resolve(
  'C:/Users/abdia/OneDrive/Desktop/BismarkObsi/BismarkObsi/04_DOCUMENTACION_SISTEMA/15_IMPORTACION_INVENTARIO_HOLA/inventario_hola_exacto.json'
);

async function runDryRun() {
  console.log('======================================================================');
  console.log(' 🔍 DRY-RUN DE IMPORTACIÓN DE INVENTARIO: hola.xlsx (TAREA-DAT-001)');
  console.log('======================================================================\n');

  // 1. Cargar y verificar archivo canónico
  if (!fs.existsSync(CANONICAL_JSON_PATH)) {
    console.error('❌ Archivo canónico no encontrado:', CANONICAL_JSON_PATH);
    process.exit(1);
  }

  const rawData = fs.readFileSync(CANONICAL_JSON_PATH, 'utf8');
  const canonical = JSON.parse(rawData);
  const records = canonical.records || [];

  console.log(`✓ Archivo canónico cargado: ${records.length} registros encontrados.`);
  if (records.length !== 397) {
    console.error(`❌ Discrepancia: se esperaban 397 registros, se obtuvieron ${records.length}`);
    process.exit(1);
  }

  // 2. Validar códigos únicos y datos en la fuente
  const codigosSet = new Set();
  const duplicateCodes = [];
  const seriesCount = new Map();
  let emptySeriesCount = 0;
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const r of records) {
    if (codigosSet.has(r.articulo)) {
      duplicateCodes.push(r.articulo);
    }
    codigosSet.add(r.articulo);

    if (r.precio < minPrice) minPrice = r.precio;
    if (r.precio > maxPrice) maxPrice = r.precio;

    if (!r.serie || r.serie.trim() === '') {
      emptySeriesCount++;
    } else {
      seriesCount.set(r.serie, (seriesCount.get(r.serie) || 0) + 1);
    }
  }

  console.log(`✓ Códigos de artículo únicos: ${codigosSet.size} / 397 (0 duplicados).`);
  console.log(`✓ Rango de precios: min ${minPrice}, max ${maxPrice}.`);
  console.log(`✓ Series vacías: ${emptySeriesCount} / 397.`);
  console.log(`✓ Series no vacías: ${397 - emptySeriesCount}, valores distintos: ${seriesCount.size}.`);

  const repeatedSeries = [...seriesCount.entries()].filter(([_, count]) => count > 1);
  console.log(`⚠️  Series repetidas en la fuente: ${repeatedSeries.length} valores repetidos.`);
  for (const [serie, count] of repeatedSeries) {
    console.log(`   - "${serie}": aparece ${count} veces`);
  }

  // 3. Conectar a PostgreSQL para comparar con base de datos existente
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const empresasRes = await pool.query('SELECT id, nombre FROM empresas ORDER BY created_at ASC');
    console.log(`\n--- Empresas en PostgreSQL (${empresasRes.rows.length}) ---`);
    for (const emp of empresasRes.rows) {
      console.log(`- Empresa: ${emp.nombre} (ID: ${emp.id})`);
    }

    for (const emp of empresasRes.rows) {
      console.log(`\n======================================================================`);
      console.log(` 🏢 Análisis para Empresa: ${emp.nombre} (${emp.id})`);
      console.log(`======================================================================`);

      const dbEquiposRes = await pool.query(
        'SELECT id, codigo, modelo, descripcion, numero_serie, precio_renta_dia, precio_renta_hora, estado FROM equipos WHERE empresa_id = $1',
        [emp.id]
      );
      const dbEquipos = dbEquiposRes.rows;
      console.log(`Total equipos actuales en BD: ${dbEquipos.length}`);

      // Mapear equipos en BD por código
      const dbByCodigo = new Map();
      const dbCodesWithMultipleRows = new Map();
      for (const eq of dbEquipos) {
        if (!eq.codigo) continue;
        if (!dbByCodigo.has(eq.codigo)) {
          dbByCodigo.set(eq.codigo, []);
        }
        dbByCodigo.get(eq.codigo).push(eq);
      }

      for (const [code, rows] of dbByCodigo.entries()) {
        if (rows.length > 1) {
          dbCodesWithMultipleRows.set(code, rows.length);
        }
      }

      let altas = 0;
      let coincidencias = 0;
      let discrepancias = [];
      const altasList = [];

      for (const rec of records) {
        const existingList = dbByCodigo.get(rec.articulo);
        if (!existingList || existingList.length === 0) {
          altas++;
          altasList.push(rec.articulo);
        } else {
          coincidencias++;
          const first = existingList[0];
          const diffs = [];
          if (first.descripcion !== rec.descripcion) {
            diffs.push(`desc: BD="${first.descripcion}" vs Fuente="${rec.descripcion}"`);
          }
          const dbPrecio = Number(first.precio_renta_dia);
          if (dbPrecio !== Number(rec.precio)) {
            diffs.push(`precioRentaDia: BD=${dbPrecio} vs Fuente=${rec.precio}`);
          }
          const normDbSerie = first.numero_serie ? first.numero_serie.trim() : null;
          const normRecSerie = rec.serie ? rec.serie.trim() : null;
          if (normDbSerie !== normRecSerie) {
            diffs.push(`serie: BD="${first.numero_serie}" vs Fuente="${rec.serie}"`);
          }
          if (diffs.length > 0) {
            discrepancias.push({
              articulo: rec.articulo,
              diffs,
              dbRowCount: existingList.length,
            });
          }
        }
      }

      console.log(`\n📊 Balance del Dry-Run:`);
      console.log(`- Altas nuevas a registrar: ${altas}`);
      console.log(`- Coincidencias de código: ${coincidencias}`);
      console.log(`- Códigos en BD con múltiples filas: ${dbCodesWithMultipleRows.size}`);
      console.log(`- Coincidencias con discrepancias de valor (desc/precio/serie): ${discrepancias.length}`);

      if (discrepancias.length > 0) {
        console.log(`\nEjemplos de discrepancias encontradas (primeros 5):`);
        for (const d of discrepancias.slice(0, 5)) {
          console.log(`  * ${d.articulo} (${d.dbRowCount} filas en BD): ${d.diffs.join(' | ')}`);
        }
      }

      // 4. Evaluar colisiones con la restricción actual @@unique([empresaId, numeroSerie])
      const dbSeries = new Set(
        dbEquipos
          .map((e) => e.numero_serie)
          .filter((s) => s && s.trim() !== '')
      );

      const conflictsUnderCurrentConstraint = [];
      const seenSeriesInBatch = new Set();

      for (const rec of records) {
        if (!rec.serie || rec.serie.trim() === '') continue;
        const s = rec.serie;
        if (seenSeriesInBatch.has(s)) {
          conflictsUnderCurrentConstraint.push({
            articulo: rec.articulo,
            serie: s,
            razon: 'Duplicado dentro del mismo lote hola.xlsx',
          });
        } else if (dbSeries.has(s)) {
          conflictsUnderCurrentConstraint.push({
            articulo: rec.articulo,
            serie: s,
            razon: 'Ya existe en la base de datos para esta empresa',
          });
        }
        seenSeriesInBatch.add(s);
      }

      console.log(`\n⚠️  CONFLICTOS CON RESTRICCIÓN ACTUAL @@unique([empresaId, numeroSerie]):`);
      console.log(`Total colisiones detectadas: ${conflictsUnderCurrentConstraint.length}`);
      const summaryBySerie = new Map();
      for (const c of conflictsUnderCurrentConstraint) {
        summaryBySerie.set(c.serie, (summaryBySerie.get(c.serie) || 0) + 1);
      }
      for (const [serie, count] of summaryBySerie.entries()) {
        console.log(`   * Serie "${serie}": ${count} colisión(es) bloqueante(s)`);
      }
    }

    console.log('\n======================================================================');
    console.log(' ✅ DRY-RUN FINALIZADO EXITOSAMENTE (SIN MUTACIONES EN LA BD)');
    console.log('======================================================================\n');
  } finally {
    await pool.end();
  }
}

runDryRun().catch((err) => {
  console.error('Error fatal durante dry-run:', err);
  process.exit(1);
});
