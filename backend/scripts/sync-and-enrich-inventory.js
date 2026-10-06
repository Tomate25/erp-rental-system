/**
 * Script de sincronización y enriquecimiento de inventario para la empresa activa
 * - Tenant activo: fedb4b05-e281-4956-9367-5a0530976e60
 * - Enriquecimiento de modelos reales desde el catálogo de junio
 * - Ingesta de equipos faltantes (08-04 Retroexcavadora JCB, 07-49 a 07-54 Camiones, etc.)
 */
require('dotenv').config();
const { Client } = require('pg');

const ACTIVE_TENANT = 'fedb4b05-e281-4956-9367-5a0530976e60';
const SOURCE_TENANT = '406c879b-97cd-45ff-a22e-69fda073999e';
const SUCURSAL_ID = 'a98976b2-12ba-4995-a541-6526e0e68405';

async function main() {
  console.log('======================================================================');
  console.log('🚜 SINCRONIZACIÓN Y ENRIQUECIMIENTO DE INVENTARIO Y MAQUINARIA');
  console.log('======================================================================\n');

  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:7Hncl05dpakbMWpcoz9JpJJBhrckls4P_C5KPa0Rn3MjOPPaskm8p9yotj1lJics@localhost:5432/erp_dev?schema=public';

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Enriquecer modelos de equipos existentes en el tenant activo
    console.log('1. Enriqueciendo modelos en tenant activo...');
    const updateRes = await client.query(`
      UPDATE equipos e1
      SET modelo = e2.modelo,
          updated_at = NOW()
      FROM (
        SELECT DISTINCT ON (codigo) codigo, modelo
        FROM equipos
        WHERE empresa_id = $1
          AND modelo IS NOT NULL
          AND modelo != 'S/M'
        ORDER BY codigo, created_at ASC
      ) e2
      WHERE e1.empresa_id = $2
        AND e1.codigo = e2.codigo
        AND (e1.modelo = 'S/M' OR e1.modelo IS NULL)
    `, [SOURCE_TENANT, ACTIVE_TENANT]);
    console.log(`✓ Modelos actualizados desde catálogo: ${updateRes.rowCount}`);

    // Para los que todavía queden con 'S/M', si la descripción tiene texto descriptivo, usarlo
    const fallbackRes = await client.query(`
      UPDATE equipos
      SET modelo = TRIM(descripcion),
          updated_at = NOW()
      WHERE empresa_id = $1
        AND (modelo = 'S/M' OR modelo IS NULL)
        AND descripcion IS NOT NULL
        AND TRIM(descripcion) != ''
    `, [ACTIVE_TENANT]);
    console.log(`✓ Modelos complementados con descripción: ${fallbackRes.rowCount}`);

    // 2. Traer equipos faltantes desde el catálogo fuente
    console.log('\n2. Buscando equipos en catálogo no presentes en el tenant activo...');
    const missingRes = await client.query(`
      SELECT DISTINCT ON (codigo) *
      FROM equipos
      WHERE empresa_id = $1
        AND codigo NOT IN (
          SELECT codigo FROM equipos WHERE empresa_id = $2
        )
      ORDER BY codigo, created_at ASC
    `, [SOURCE_TENANT, ACTIVE_TENANT]);

    console.log(`Encontrados ${missingRes.rows.length} equipos faltantes para incorporar.`);

    let insertedCount = 0;
    for (const row of missingRes.rows) {
      await client.query(`
        INSERT INTO equipos (
          id, empresa_id, sucursal_id, categoria_id, marca_id, subcategoria_id,
          codigo, modelo, numero_serie, descripcion, estado,
          horometro, precio_renta_dia, precio_renta_hora, modalidad_renta,
          tipo_control, cantidad_disponible, cantidad_total,
          horometro_ultimo_servicio, intervalo_servicio_horas, minimo_horas,
          tipo_medicion_combustible, capacidad_tanque_galones,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20,
          $21, $22,
          NOW(), NOW()
        )
      `, [
        ACTIVE_TENANT,
        SUCURSAL_ID,
        row.categoria_id,
        row.marca_id,
        row.subcategoria_id,
        row.codigo,
        row.modelo || row.descripcion || 'S/M',
        row.numero_serie,
        row.descripcion,
        row.estado || 'DISPONIBLE',
        row.horometro || 0,
        row.precio_renta_dia || 0,
        row.precio_renta_hora || null,
        row.modalidad_renta || 'SOLO_DIA',
        row.tipo_control || 'SERIALIZADO',
        row.cantidad_disponible || 1,
        row.cantidad_total || 1,
        row.horometro_ultimo_servicio || 0,
        row.intervalo_servicio_horas || 250,
        row.minimo_horas || null,
        row.tipo_medicion_combustible || null,
        row.capacidad_tanque_galones || null,
      ]);
      insertedCount++;
    }
    console.log(`✓ Equipos insertados exitosamente en tenant activo: ${insertedCount}`);

    // 3. Activar is_linea_amarilla en categorías pesadas
    await client.query(`
      UPDATE categorias
      SET is_linea_amarilla = true
      WHERE UPPER(nombre) LIKE '%AMARILLA%'
         OR UPPER(nombre) LIKE '%PESADA%'
         OR UPPER(nombre) LIKE '%COMPACTACION%'
    `);
    console.log('✓ Banderas is_linea_amarilla activadas en categorías pesadas.');

    await client.query('COMMIT');
    console.log('\n✅ SINCRONIZACIÓN Y ENRIQUECIMIENTO COMPLETADO CON ÉXITO');

    // Conteo final
    const countRes = await client.query(`
      SELECT count(*) as total,
             count(*) filter (where modelo != 'S/M' and modelo is not null) as con_modelo_real,
             count(*) filter (where codigo like '08-%') as linea_amarilla_08,
             count(*) filter (where codigo like '07-%') as vehiculos_07
      FROM equipos
      WHERE empresa_id = $1
    `, [ACTIVE_TENANT]);
    console.table(countRes.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR DURANTE LA SINCRONIZACIÓN:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
