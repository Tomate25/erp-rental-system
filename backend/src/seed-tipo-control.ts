import 'dotenv/config';
import { PrismaClient, TipoControlEquipo } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en .env');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== POBLAMIENTO Y ASIGNACIÓN DE TIPO DE CONTROL EN EL INVENTARIO ===');

  const equipments = await prisma.equipo.findMany({
    include: { categoria: true }
  });

  let countSerializado = 0;
  let countCantidad = 0;

  for (const eq of equipments) {
    const catName = (eq.categoria?.nombre || '').toLowerCase();
    
    // Categorías con control POR_CANTIDAD
    const isCantidad = catName.includes('encofrado') || 
                       catName.includes('andamio') || 
                       catName.includes('seguridad') || 
                       catName.includes('accesorios');

    const targetControl: TipoControlEquipo = isCantidad ? TipoControlEquipo.POR_CANTIDAD : TipoControlEquipo.SERIALIZADO;

    await prisma.equipo.update({
      where: { id: eq.id },
      data: { tipoControl: targetControl }
    });

    if (targetControl === TipoControlEquipo.POR_CANTIDAD) {
      countCantidad++;
    } else {
      countSerializado++;
    }
  }

  console.log(`✅ Tipo de Control asignado a ${equipments.length} equipos:`);
  console.log(`   ├─ SERIALIZADO: ${countSerializado} ítems (Maquinaria, Generadores, Bombas, Herramientas, Vehículos)`);
  console.log(`   └─ POR_CANTIDAD: ${countCantidad} ítems (Placas de encofrado, Cuñas, Andamios, Rodos)`);
}

main()
  .catch((e) => {
    console.error('Error al asignar tipoControl:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
