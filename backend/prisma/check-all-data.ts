import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const countClientes = await prisma.cliente.count();
  const countEquipos = await prisma.equipo.count();
  const countCotizaciones = await prisma.cotizacion.count();
  const countContratos = await prisma.contrato.count();
  const countDespachos = await prisma.despacho.count();
  const countFacturas = await prisma.factura.count();

  console.log('=== VERIFICACIÓN REGISTROS EN BASE DE DATOS LOCAL (erp_dev) ===');
  console.log(`Clientes: ${countClientes}`);
  console.log(`Equipos: ${countEquipos}`);
  console.log(`Cotizaciones: ${countCotizaciones}`);
  console.log(`Contratos: ${countContratos}`);
  console.log(`Despachos: ${countDespachos}`);
  console.log(`Facturas: ${countFacturas}`);
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
