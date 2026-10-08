const fs = require('fs');
const path = require('path');
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    const dbUrlLine = envFile.split('\n').find(l => l.trim().startsWith('DATABASE_URL='));
    if (dbUrlLine) {
      dbUrl = dbUrlLine.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

if (!dbUrl) {
  console.error('❌ Error: No se encontró DATABASE_URL en process.env ni en ../.env');
  process.exit(1);
}

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Configuración inicial de tieneHorometro ---');

  // 1. Andamios y Seguridad: 100% false y limpiar combustibles erróneos
  const resAndamios = await prisma.equipo.updateMany({
    where: {
      OR: [
        { categoria: { nombre: { in: ['ANDAMIOS Y SEGURIDAD', 'ANDAMIOS'] } } },
        { descripcion: { contains: 'ANDAMIO', mode: 'insensitive' } },
        { descripcion: { contains: 'PUNTAL', mode: 'insensitive' } },
        { descripcion: { contains: 'FORMALETA', mode: 'insensitive' } },
        { descripcion: { contains: 'TIJERA', mode: 'insensitive' } },
        { descripcion: { contains: 'PLATO BASE', mode: 'insensitive' } }
      ]
    },
    data: {
      tieneHorometro: false,
      tipoMedicionCombustible: null
    }
  });
  console.log(`Equipos de andamios/puntales/formaletas marcados con tieneHorometro = false: ${resAndamios.count}`);

  // 2. Línea Amarilla / Maquinaria Pesada: 100% true
  const resPesada = await prisma.equipo.updateMany({
    where: {
      OR: [
        { categoria: { isLineaAmarilla: true } },
        { categoria: { nombre: { in: ['MAQUINARIA PESADA', 'MAQUINA AMARILLA'] } } },
        { codigo: { startsWith: '08-' } },
        { codigo: { startsWith: '07-' } },
        { codigo: { in: ['01-59', '01-39', '01-40', '01-41', '01-42'] } }
      ]
    },
    data: {
      tieneHorometro: true
    }
  });
  console.log(`Equipos de Línea Amarilla / Maquinaria Pesada marcados con tieneHorometro = true: ${resPesada.count}`);

  // 3. Generadores e Iluminación mayores con combustible o motor: true si no son torres manuales o cables
  const resGen = await prisma.equipo.updateMany({
    where: {
      AND: [
        { categoria: { nombre: 'GENERADORES E ILUMINACION' } },
        { tipoMedicionCombustible: { in: ['BARRAS', 'PORCENTAJE'] } },
        { NOT: { descripcion: { contains: 'CABLE', mode: 'insensitive' } } }
      ]
    },
    data: {
      tieneHorometro: true
    }
  });
  console.log(`Generadores e iluminación motorizados con tieneHorometro = true: ${resGen.count}`);

  // 4. Equipos con horómetro acumulado previo > 0: asegurar true
  const resHoras = await prisma.equipo.updateMany({
    where: {
      horometro: { gt: 0 }
    },
    data: {
      tieneHorometro: true
    }
  });
  console.log(`Equipos con lectura previa de horas confirmada: ${resHoras.count}`);

  // 5. Verificar recuento global
  const totalConHoro = await prisma.equipo.count({ where: { tieneHorometro: true } });
  const totalSinHoro = await prisma.equipo.count({ where: { tieneHorometro: false } });
  console.log(`\nResumen global en catálogo:`);
  console.log(`- Equipos con Horómetro (Motor/Pesada): ${totalConHoro}`);
  console.log(`- Equipos sin Horómetro (Andamios/Manuales): ${totalSinHoro}`);
  console.log(`- Total equipos en base de datos: ${totalConHoro + totalSinHoro}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
