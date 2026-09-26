require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function determineTipoMedicion(descripcion, modelo) {
  const text = `${descripcion || ''} ${modelo || ''}`.toUpperCase();

  // 1. BARRAS: BACKHOE, MINICARGADOR, RODO 3 TONELADAS
  if (
    text.includes('BACKHOE') ||
    text.includes('RETROEXCAVADORA') ||
    text.includes('MINICARGADOR') ||
    text.includes('MINI CARGADOR') ||
    text.includes('BOBCAT') ||
    (text.includes('RODO') && (text.includes('3TM') || text.includes('3 TM') || text.includes('3 TON') || text.includes('3TON')))
  ) {
    return 'BARRAS';
  }

  // 2. PORCENTAJE: GENERADORES GRANDES y COMPRESORES
  if (
    text.includes('COMPRESOR') ||
    (text.includes('GENERADOR') && (
      text.includes('GRANDE') ||
      text.includes('CONTAINER') ||
      text.includes('DOOSAN') ||
      text.includes('DENYO') ||
      text.includes('CUMMINS') ||
      text.includes('PERKINS') ||
      text.includes('MQ') ||
      text.includes('20 KVA') ||
      text.includes('25 KVA') ||
      text.includes('30 KVA') ||
      text.includes('45 KVA') ||
      text.includes('50 KVA') ||
      text.includes('60 KVA') ||
      text.includes('70 KVA') ||
      text.includes('80 KVA') ||
      text.includes('100 KVA') ||
      text.includes('125 KVA') ||
      text.includes('150 KVA')
    ))
  ) {
    return 'PORCENTAJE';
  }

  // 3. PULGADAS: GENERADORES PEQUEÑOS, COMPACTADORAS, TORRES DE ILUMINACIÓN, RODOS PEQUEÑOS
  if (
    text.includes('COMPACTADORA') ||
    text.includes('BAILARINA') ||
    text.includes('APISONADOR') ||
    text.includes('TORRE DE ILUMINACION') ||
    text.includes('TORRES DE ILUMINACION') ||
    text.includes('VIBROPLANCHA') ||
    (text.includes('RODO') && !(text.includes('3TM') || text.includes('3 TM') || text.includes('3 TON') || text.includes('3TON'))) ||
    (text.includes('GENERADOR') && (
      text.includes('PEQUEÑO') ||
      text.includes('PORTATIL') ||
      text.includes('HONDA') ||
      text.includes('MPOWER') ||
      text.includes('EMPOWER') ||
      text.includes('KIPOR') ||
      text.includes('WAKER') ||
      text.includes('SIMAQ') ||
      text.includes('3,500') ||
      text.includes('5,500') ||
      text.includes('6,500') ||
      text.includes('7,500') ||
      text.includes('8,500') ||
      text.includes('10,000') ||
      text.includes('11,000') ||
      text.includes('GASOLINA')
    ))
  ) {
    return 'PULGADAS';
  }

  // Por defecto, si no tiene combustión o es accesorio eléctrico/manual, null o PORCENTAJE
  return null;
}

async function run() {
  const equipos = await pool.query('SELECT id, codigo, descripcion, modelo, tipo_medicion_combustible FROM equipos');
  console.log(`Analizando ${equipos.rows.length} equipos...`);

  let countBarras = 0;
  let countPorcentaje = 0;
  let countPulgadas = 0;
  let countNull = 0;

  for (const eq of equipos.rows) {
    const nuevoTipo = determineTipoMedicion(eq.descripcion, eq.modelo);
    if (nuevoTipo) {
      await pool.query('UPDATE equipos SET tipo_medicion_combustible = $1 WHERE id = $2', [nuevoTipo, eq.id]);
      if (nuevoTipo === 'BARRAS') countBarras++;
      else if (nuevoTipo === 'PORCENTAJE') countPorcentaje++;
      else if (nuevoTipo === 'PULGADAS') countPulgadas++;
    } else {
      countNull++;
    }
  }

  // También actualizar tabla productos si existe
  const productos = await pool.query('SELECT id, codigo, nombre, descripcion, tipo_medicion_combustible FROM productos');
  for (const prod of productos.rows) {
    const nuevoTipo = determineTipoMedicion(prod.descripcion, prod.nombre);
    if (nuevoTipo) {
      await pool.query('UPDATE productos SET tipo_medicion_combustible = $1 WHERE id = $2', [nuevoTipo, prod.id]);
    }
  }

  console.log('Actualización completada:');
  console.log(`- BARRAS (Backhoe, Minicargador, Rodo 3T): ${countBarras}`);
  console.log(`- PORCENTAJE (Generadores Grandes, Compresores): ${countPorcentaje}`);
  console.log(`- PULGADAS (Generadores Pequeños, Compactadoras, Torres, Rodos Pequeños, Vibroplanchas): ${countPulgadas}`);
  console.log(`- OTROS (Andamios, Accesorios eléctricos/manuales): ${countNull}`);

  // Muestra de verificación
  const sample = await pool.query(`
    SELECT codigo, descripcion, tipo_medicion_combustible 
    FROM equipos 
    WHERE tipo_medicion_combustible IN ('BARRAS', 'PULGADAS') 
    LIMIT 20
  `);
  console.log('Muestra actualizada:', sample.rows);

  await pool.end();
}

run().catch(console.error);
