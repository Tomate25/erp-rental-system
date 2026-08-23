import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Sincronizando despachos y stock disponible de equipos ---');

  // 1. Obtener todos los despachos activos
  const despachos = await prisma.despacho.findMany({
    include: { items: true }
  });

  // Mapa de cantidad despachada por equipo
  const despachadoPorEquipo: Record<string, number> = {};
  for (const desp of despachos) {
    for (const item of desp.items) {
      if (item.equipoId) {
        despachadoPorEquipo[item.equipoId] = (despachadoPorEquipo[item.equipoId] || 0) + (item.cantidad || 1);
      }
    }
  }

  // 2. Obtener todas las devoluciones completadas
  const devoluciones = await prisma.devolucion.findMany({
    include: { items: true }
  });

  for (const dev of devoluciones) {
    for (const item of dev.items) {
      if (item.equipoId && despachadoPorEquipo[item.equipoId]) {
        despachadoPorEquipo[item.equipoId] = Math.max(0, despachadoPorEquipo[item.equipoId] - (item.cantidadRetornada || 1));
      }
    }
  }

  // 3. Actualizar equipos en base de datos
  const equipos = await prisma.equipo.findMany();
  for (const eq of equipos) {
    const cantEnUso = despachadoPorEquipo[eq.id] || 0;
    const total = Math.max(4, eq.cantidadTotal);
    const disp = Math.max(0, total - cantEnUso);
    const estado = cantEnUso > 0 ? (disp === 0 ? 'RENTADO' : 'DESPACHADO') : 'DISPONIBLE';

    await prisma.equipo.update({
      where: { id: eq.id },
      data: {
        cantidadTotal: total,
        cantidadDisponible: disp,
        estado: estado as any
      }
    });

    if (cantEnUso > 0) {
      console.log(`📌 [${eq.codigo || 'S/C'}] ${eq.modelo} -> Stock Actualizado: ${disp} Disp. / ${total} Total (${cantEnUso} En Uso / ${estado})`);
    }
  }

  console.log('✅ Sincronización completa de despachos y stock disponible finalizada.');
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
