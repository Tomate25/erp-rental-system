import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const clients = await prisma.cliente.findMany();
  const contracts = await prisma.contrato.findMany();
  const equipments = await prisma.equipo.findMany();

  console.log(`📊 Clientes en BD (${clients.length}):`, clients.map(c => ({ id: c.id, nombre: c.nombre })));
  console.log(`📊 Contratos en BD (${contracts.length}):`, contracts.map(c => ({ id: c.id, codigo: c.codigo })));
  console.log(`📊 Equipos en BD (${equipments.length}):`, equipments.map(e => ({ id: e.id, modelo: e.modelo })));

  await prisma.$disconnect();
  await pool.end();
}

main();
