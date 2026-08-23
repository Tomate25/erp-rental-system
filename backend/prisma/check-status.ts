import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const equipos = await prisma.equipo.findMany({
    include: {
      categoria: true,
      marca: true
    }
  });

  const enUso = equipos.filter(e => e.cantidadTotal - e.cantidadDisponible > 0 || e.estado === 'RENTADO' || e.estado === 'DESPACHADO' || e.estado === 'EN_ALQUILER');
  const enMantenimiento = equipos.filter(e => e.estado === 'MANTENIMIENTO' || e.estado === 'EN_MANTENIMIENTO');
  const disponibles = equipos.filter(e => e.cantidadDisponible > 0 && e.estado === 'DISPONIBLE');

  console.log(`=== INFORME ESTADO DE MAQUINARIA E INVENTARIO ===`);
  console.log(`Total Modelos: ${equipos.length}`);
  console.log(`🟢 Disponibles: ${disponibles.length} modelos`);
  console.log(`🔴 En Uso / Alquilados: ${enUso.length} modelos`);
  console.log(`🛠️ En Mantenimiento: ${enMantenimiento.length} modelos`);

  if (enUso.length > 0) {
    console.log('\n--- DETALLE EQUIPOS EN USO (ALQUILADOS) ---');
    enUso.forEach(e => {
      const cantUso = Math.max(0, e.cantidadTotal - e.cantidadDisponible);
      console.log(`• [${e.codigo || 'S/C'}] ${e.modelo} (${e.marca.nombre}) -> En uso: ${cantUso > 0 ? cantUso : 1} u. / Total: ${e.cantidadTotal}`);
    });
  }

  if (enMantenimiento.length > 0) {
    console.log('\n--- DETALLE EQUIPOS EN MANTENIMIENTO ---');
    enMantenimiento.forEach(e => {
      console.log(`• [${e.codigo || 'S/C'}] ${e.modelo} (${e.marca.nombre}) -> Estado: Mantenimiento`);
    });
  }
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
