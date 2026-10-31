require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/erp_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRolePerms() {
  console.log('=== Configurando Permisos por Defecto para Roles ===');
  const allPerms = await prisma.permiso.findMany();
  const permMap = new Map(allPerms.map((p) => [p.codigo, p.id]));

  const rolePermMap = {
    ADMIN: [
      'CLIENT.CREATE',
      'CLIENT.UPDATE',
      'CLIENT.VIEW',
      'QUOTE.CREATE',
      'QUOTE.APPROVE',
      'CONTRACT.CREATE',
      'INVENTORY.CREATE',
      'INVENTORY.VIEW',
      'DISPATCH.CREATE',
      'RETURN.CREATE',
      'REPORT.EXPORT',
      'NUMERACION.MANAGE',
      'NUMERACION.VIEW',
    ],
    GERENTE: [
      'CLIENT.CREATE',
      'CLIENT.UPDATE',
      'CLIENT.VIEW',
      'QUOTE.CREATE',
      'QUOTE.APPROVE',
      'CONTRACT.CREATE',
      'INVENTORY.VIEW',
      'DISPATCH.CREATE',
      'RETURN.CREATE',
      'REPORT.EXPORT',
      'NUMERACION.MANAGE',
      'NUMERACION.VIEW',
    ],
    COMERCIAL: [
      'CLIENT.CREATE',
      'CLIENT.UPDATE',
      'CLIENT.VIEW',
      'QUOTE.CREATE',
      'CONTRACT.CREATE',
      'INVENTORY.VIEW',
    ],
    OPERACIONES: [
      'CLIENT.VIEW',
      'INVENTORY.VIEW',
      'DISPATCH.CREATE',
      'RETURN.CREATE',
    ],
    FACTURACION: [
      'CLIENT.VIEW',
      'INVENTORY.VIEW',
      'NUMERACION.VIEW',
      'REPORT.EXPORT',
    ],
    CONTABILIDAD: [
      'CLIENT.VIEW',
      'INVENTORY.VIEW',
      'NUMERACION.MANAGE',
      'NUMERACION.VIEW',
      'REPORT.EXPORT',
    ],
    MANTENIMIENTO: [
      'INVENTORY.VIEW',
      'DISPATCH.CREATE',
      'RETURN.CREATE',
    ],
    RRHH: [
      'REPORT.EXPORT',
    ],
  };

  for (const [roleName, permCodes] of Object.entries(rolePermMap)) {
    let rol = await prisma.rol.findFirst({
      where: { nombre: roleName, empresaId: null },
    });
    if (!rol) {
      rol = await prisma.rol.findFirst({
        where: { nombre: roleName },
      });
    }
    if (!rol) {
      console.log('Rol no encontrado:', roleName);
      continue;
    }

    const validPermIds = permCodes
      .map((code) => permMap.get(code))
      .filter(Boolean);

    // Prune obsoletos para asegurar congruencia exacta
    await prisma.rolPermiso.deleteMany({
      where: {
        rolId: rol.id,
        permisoId: { notIn: validPermIds },
      },
    });

    for (const code of permCodes) {
      const permisoId = permMap.get(code);
      if (!permisoId) {
        console.warn(`Permiso ${code} no existe en la base de datos`);
        continue;
      }
      await prisma.rolPermiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: rol.id,
            permisoId: permisoId,
          },
        },
        create: {
          rolId: rol.id,
          permisoId: permisoId,
        },
        update: {},
      });
    }

    const count = await prisma.rolPermiso.count({ where: { rolId: rol.id } });
    console.log(`✓ Rol ${roleName}: ${count} permisos configurados.`);
  }

  await pool.end();
}

seedRolePerms().catch((err) => {
  console.error('Error seeding role permissions:', err);
  process.exit(1);
});
