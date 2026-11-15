import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

interface CatalogoNode {
  codigo: string;
  nombre: string;
  nivel: number;
  tipo: string;
  naturaleza: 'Deudora' | 'Acreedora';
  aceptaMovimiento: boolean;
  esControl: boolean;
  mayorCodigo?: string;
  mayorNombre?: string;
  estado?: string;
  renglon?: string;
  qbTipo?: string;
  qbNombre?: string;
}

interface SaldosData {
  fechaCorte: string;
  items: Array<{
    codigo: string;
    nombre: string;
    deudor: number;
    acreedor: number;
  }>;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const candidateDirs = [
      path.resolve(process.cwd(), 'src', 'modules', 'accounting', 'data'),
      path.resolve(process.cwd(), 'dist', 'modules', 'accounting', 'data'),
      path.resolve(process.cwd(), 'dist', 'src', 'modules', 'accounting', 'data'),
    ];
    const dataDir = candidateDirs.find((dir) =>
      fs.existsSync(path.join(dir, 'catalogo-cuentas-bm.json')),
    );
    if (!dataDir) {
      throw new Error(`No se encontró catalogo-cuentas-bm.json en: ${candidateDirs.join(', ')}`);
    }
    const catalogo: CatalogoNode[] = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'catalogo-cuentas-bm.json'), 'utf8'),
    );
    const saldosData: SaldosData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'saldos-iniciales-bm.json'), 'utf8'),
    );

    const empresas = await prisma.empresa.findMany({
      select: { id: true, nombre: true },
    });

    if (empresas.length === 0) {
      throw new Error('No se encontraron empresas en la base de datos.');
    }

    const fechaCorte = new Date(`${saldosData.fechaCorte}T00:00:00.000Z`);

    for (const emp of empresas) {
      await prisma.$transaction(async (tx) => {
        await tx.cuentaContable.deleteMany({ where: { empresaId: emp.id } });
        await tx.saldoInicialContable.deleteMany({ where: { empresaId: emp.id } });

        await tx.cuentaContable.createMany({
          data: catalogo.map((c) => ({
            empresaId: emp.id,
            codigo: c.codigo,
            nombre: c.nombre,
            nivel: c.nivel,
            mayorCodigo: c.mayorCodigo || null,
            mayorNombre: c.mayorNombre || null,
            tipo: c.tipo,
            naturaleza: c.naturaleza,
            estadoFinanciero: c.estado || null,
            renglon: c.renglon || null,
            aceptaMovimiento: Boolean(c.aceptaMovimiento),
            esControl: Boolean(c.esControl),
            qbTipo: c.qbTipo || null,
            qbNombre: c.qbNombre || null,
            activa: true,
          })),
        });

        await tx.saldoInicialContable.createMany({
          data: saldosData.items.map((item) => ({
            empresaId: emp.id,
            fechaCorte,
            cuentaCodigo: item.codigo,
            cuentaNombre: item.nombre,
            deudor: Number(item.deudor || 0),
            acreedor: Number(item.acreedor || 0),
            notas: 'Importado desde BM Saldos y catalogo sistema N.xlsx (corte 31/10/2026)',
          })),
        });
      });

      console.log(
        `[OK] Empresa ${emp.nombre} (${emp.id}): ${catalogo.length} cuentas y ${saldosData.items.length} saldos iniciales cargados.`,
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error importando catálogo y saldos BM:', err);
  process.exit(1);
});
