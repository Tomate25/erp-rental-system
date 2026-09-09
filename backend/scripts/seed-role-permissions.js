const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:postgres@localhost:5432/erp_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRolePerms() {
  console.log('=== Configurando Permisos por Defecto para Roles ===');
  const allPerms = await prisma.permiso.findMany();
  const permMap = new Map(allPerms.map(p => [p.codigo, p.id]));

  const rolePermMap = {
    ADMIN: [
      'CLIENT.CREATE', 'CLIENT.UPDATE', 'CLIENT.VIEW',
      'QUOTE.CREATE', 'QUOTE.APPROVE', 'CONTRACT.CREATE',
      'INVENTORY.CREATE', 'INVENTORY.VIEW',
      'DISPATCH.CREATE', 'RETURN.CREATE',
      'REPORT.EXPORT'
    ],
    GERENTE: [
      'CLIENT.CREATE', 'CLIENT.UPDATE', 'CLIENT.VIEW',
      'QUOTE.CREATE', 'QUOTE.APPROVE', 'CONTRACT.CREATE',
      'INVENTORY.VIEW', 'DISPATCH.CREATE', 'RETURN.CREATE',
      'REPORT.EXPORT'
    ],
    COMERCIAL: [
      'CLIENT.CREATE', 'CLIENT.UPDATE', 'CLIENT.VIEW',
      'QUOTE.CREATE', 'CONTRACT.CREATE', 'INVENTORY.VIEW'
    ],
    OPERACIONES: [
      'CLIENT.VIEW', 'INVENTORY.VIEW', 'DISPATCH.CREATE', 'RETURN.CREATE'
    ],
    FACTURACION: [
      'CLIENT.VIEW', 'CONTRACT.CREATE', 'REPORT.EXPORT', 'INVENTORY.VIEW'
    ],
    CONTABILIDAD: [
      'CLIENT.VIEW', 'REPORT.EXPORT', 'INVENTORY.VIEW'
    ],
    MANTENIMIENTO: [
      'INVENTORY.VIEW', 'INVENTORY.CREATE', 'RETURN.CREATE'
    ]
  };

  for (const [roleName, permCodes] of Object.entries(rolePermMap)) {
    const rol = await prisma.rol.findUnique({ where: { nombre: roleName } });
    if (!rol) {
      console.log('Rol no encontrado:', roleName);
      continue;
    }

    for (const code of permCodes) {
      const permisoId = permMap.get(code);
      if (!permisoId) continue;
      await prisma.rolPermiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: rol.id,
            permisoId: permisoId
          }
        },
        create: {
          rolId: rol.id,
          permisoId: permisoId
        },
        update: {}
      });
    }

    const count = await prisma.rolPermiso.count({ where: { rolId: rol.id } });
    console.log(`✓ Rol ${roleName}: ${count} permisos configurados.`);
  }

  await pool.end();
}

seedRolePerms().catch(err => {
  console.error('Error seeding role permissions:', err);
  process.exit(1);
});
