const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function configurePricing() {
  console.log('--- 1. Actualizando categorías ---');
  // Asegurar que COMPACTACION y otras categorías no pesadas tengan is_linea_amarilla = false
  await pool.query(`
    UPDATE categorias
    SET is_linea_amarilla = false
    WHERE nombre NOT IN ('MAQUINA AMARILLA', 'MAQUINARIA PESADA', 'Excavación')
  `);

  // Asegurar que categorías de maquinaria pesada tengan is_linea_amarilla = true
  await pool.query(`
    UPDATE categorias
    SET is_linea_amarilla = true
    WHERE nombre IN ('MAQUINA AMARILLA', 'MAQUINARIA PESADA', 'Excavación')
  `);

  console.log('--- 2. Configurando Línea Amarilla (08-xx o categorías pesadas) ---');
  // 08-01: Bobcat 236D3
  await pool.query(`
    UPDATE equipos
    SET modalidad_renta = 'SOLO_HORA',
        precio_renta_hora = 165.0000,
        precio_hora_b = 145.0000,
        precio_hora_c = 130.0000,
        precio_renta_dia = 1320.0000,
        precio_dia_b = 1160.0000,
        precio_dia_c = 1040.0000
    WHERE codigo = '08-01'
  `);

  // 08-02: Retroexcavadora Muller MR406
  await pool.query(`
    UPDATE equipos
    SET modalidad_renta = 'SOLO_HORA',
        precio_renta_hora = 251.8750,
        precio_hora_b = 220.0000,
        precio_hora_c = 195.0000,
        precio_renta_dia = 2015.0000,
        precio_dia_b = 1760.0000,
        precio_dia_c = 1560.0000
    WHERE codigo = '08-02'
  `);

  // 08-03: Bobcat S570
  await pool.query(`
    UPDATE equipos
    SET modalidad_renta = 'SOLO_HORA',
        precio_renta_hora = 805.7300,
        precio_hora_b = 700.0000,
        precio_hora_c = 620.0000,
        precio_renta_dia = 6445.8400,
        precio_dia_b = 5600.0000,
        precio_dia_c = 4960.0000
    WHERE codigo = '08-03'
  `);

  // 08-04: Retroexcavadora JCB 3CX
  await pool.query(`
    UPDATE equipos
    SET modalidad_renta = 'SOLO_HORA',
        precio_renta_hora = 250.0000,
        precio_hora_b = 220.0000,
        precio_hora_c = 195.0000,
        precio_renta_dia = 2000.0000,
        precio_dia_b = 1750.0000,
        precio_dia_c = 1550.0000
    WHERE codigo = '08-04'
  `);

  // Cualquier otro equipo en categoría pesada que no sea 08-xx
  await pool.query(`
    UPDATE equipos e
    SET modalidad_renta = 'SOLO_HORA',
        precio_hora_b = ROUND(COALESCE(precio_renta_hora, precio_renta_dia / 8) * 0.88, 2),
        precio_hora_c = ROUND(COALESCE(precio_renta_hora, precio_renta_dia / 8) * 0.78, 2),
        precio_dia_b = ROUND(precio_renta_dia * 0.88, 2),
        precio_dia_c = ROUND(precio_renta_dia * 0.78, 2)
    FROM categorias c
    WHERE e.categoria_id = c.id
      AND c.is_linea_amarilla = true
      AND e.codigo NOT IN ('08-01', '08-02', '08-03', '08-04')
  `);

  console.log('--- 3. Configurando Resto de Equipos (Modalidad SOLO_DIA y Precios A, B, C) ---');
  await pool.query(`
    UPDATE equipos e
    SET modalidad_renta = 'SOLO_DIA',
        precio_dia_b = CASE 
          WHEN precio_renta_dia > 0 THEN ROUND(precio_renta_dia * 0.85, 2)
          ELSE 0.0000
        END,
        precio_dia_c = CASE 
          WHEN precio_renta_dia > 0 THEN ROUND(precio_renta_dia * 0.75, 2)
          ELSE 0.0000
        END,
        precio_hora_b = CASE 
          WHEN precio_renta_hora IS NOT NULL AND precio_renta_hora > 0 THEN ROUND(precio_renta_hora * 0.85, 2)
          ELSE NULL
        END,
        precio_hora_c = CASE 
          WHEN precio_renta_hora IS NOT NULL AND precio_renta_hora > 0 THEN ROUND(precio_renta_hora * 0.75, 2)
          ELSE NULL
        END
    FROM categorias c
    WHERE e.categoria_id = c.id
      AND c.is_linea_amarilla = false
      AND (e.codigo IS NULL OR NOT e.codigo LIKE '08-%')
  `);

  console.log('--- 4. Sincronizando tabla productos ---');
  await pool.query(`
    UPDATE productos p
    SET modalidad_renta = CASE 
          WHEN c.is_linea_amarilla = true OR p.codigo LIKE '08-%' THEN 'SOLO_HORA'::"ModalidadRenta"
          ELSE 'SOLO_DIA'::"ModalidadRenta"
        END,
        precio_dia_b = CASE 
          WHEN precio_renta_dia > 0 THEN ROUND(precio_renta_dia * 0.85, 2)
          ELSE 0.0000
        END,
        precio_dia_c = CASE 
          WHEN precio_renta_dia > 0 THEN ROUND(precio_renta_dia * 0.75, 2)
          ELSE 0.0000
        END,
        precio_hora_b = CASE 
          WHEN precio_renta_hora IS NOT NULL AND precio_renta_hora > 0 THEN ROUND(precio_renta_hora * 0.85, 2)
          ELSE NULL
        END,
        precio_hora_c = CASE 
          WHEN precio_renta_hora IS NOT NULL AND precio_renta_hora > 0 THEN ROUND(precio_renta_hora * 0.75, 2)
          ELSE NULL
        END
    FROM categorias c
    WHERE p.categoria_id = c.id
  `);

  const resumen = await pool.query(`
    SELECT 
      modalidad_renta, 
      count(*) as cantidad,
      avg(precio_renta_dia)::numeric(10,2) as avg_dia_a,
      avg(precio_dia_b)::numeric(10,2) as avg_dia_b,
      avg(precio_dia_c)::numeric(10,2) as avg_dia_c
    FROM equipos
    GROUP BY modalidad_renta
  `);
  console.log('RESUMEN EQUIPOS:');
  console.table(resumen.rows);

  const lineaAmarillaSummary = await pool.query(`
    SELECT codigo, modelo, modalidad_renta, precio_renta_hora, precio_hora_b, precio_hora_c, precio_renta_dia, precio_dia_b, precio_dia_c
    FROM equipos
    WHERE codigo LIKE '08-%'
    LIMIT 4
  `);
  console.log('MUESTRA LINEA AMARILLA:');
  console.table(lineaAmarillaSummary.rows);

  await pool.end();
}

configurePricing().catch(err => {
  console.error('Error configurando precios:', err);
  pool.end();
  process.exit(1);
});
