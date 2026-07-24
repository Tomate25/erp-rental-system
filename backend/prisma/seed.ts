import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando semillado de base de datos...');

  // 1. Crear Empresa Demo
  const empresa = await prisma.empresa.upsert({
    where: { rfc: 'RME260723AAA' },
    update: {},
    create: {
      nombre: 'Rental Machinery S.A. de C.V.',
      rfc: 'RME260723AAA',
      email: 'contacto@rentalmachinery.com',
      telefono: '5551234567',
      direccion: 'Av. Industrial 100, Ciudad Industrial',
    },
  });
  console.log(`🏢 Empresa creada: ${empresa.nombre} (${empresa.id})`);

  // 2. Crear Sucursal Demo
  const sucursal = await prisma.sucursal.upsert({
    where: { codigo: 'SUC-CENTRAL' },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: 'Sucursal Central CDMX',
      codigo: 'SUC-CENTRAL',
      direccion: 'Av. Constituyentes 500, Lomas de Chapultepec',
      telefono: '5559876543',
    },
  });
  console.log(`📍 Sucursal creada: ${sucursal.nombre} (${sucursal.id})`);

  // 3. Crear Roles
  const rolesADefinir = [
    { nombre: 'ADMIN', descripcion: 'Administrador del sistema con acceso total' },
    { nombre: 'GERENTE', descripcion: 'Gerente comercial y operativo' },
    { nombre: 'COMERCIAL', descripcion: 'Ejecutivo de ventas y cotizaciones' },
    { nombre: 'OPERACIONES', descripcion: 'Encargado de despachos y devoluciones' },
    { nombre: 'MANTENIMIENTO', descripcion: 'Técnico encargado de reparaciones y horómetros' },
    { nombre: 'FACTURACION', descripcion: 'Encargado financiero y cobros' },
    { nombre: 'CLIENTE', descripcion: 'Cliente con acceso al portal' },
  ];

  const rolesCreados = [];
  for (const item of rolesADefinir) {
    const rol = await prisma.rol.upsert({
      where: { nombre: item.nombre },
      update: { descripcion: item.descripcion },
      create: item,
    });
    rolesCreados.push(rol);
  }
  console.log(`🔐 Roles creados: ${rolesCreados.map((r) => r.nombre).join(', ')}`);

  // 4. Crear Permisos básicos
  const permisosADefinir = [
    { codigo: 'CLIENT.CREATE', descripcion: 'Crear nuevos clientes' },
    { codigo: 'CLIENT.UPDATE', descripcion: 'Editar clientes existentes' },
    { codigo: 'CLIENT.VIEW', descripcion: 'Ver catálogo de clientes' },
    { codigo: 'QUOTE.CREATE', descripcion: 'Crear cotizaciones' },
    { codigo: 'QUOTE.APPROVE', descripcion: 'Aprobar cotizaciones comercialmente' },
    { codigo: 'CONTRACT.CREATE', descripcion: 'Generar contratos de renta' },
    { codigo: 'INVENTORY.CREATE', descripcion: 'Dar de alta maquinaria' },
    { codigo: 'INVENTORY.VIEW', descripcion: 'Ver inventario y disponibilidad' },
    { codigo: 'DISPATCH.CREATE', descripcion: 'Registrar despachos de equipos' },
    { codigo: 'RETURN.CREATE', descripcion: 'Registrar devolución de equipos' },
    { codigo: 'REPORT.EXPORT', descripcion: 'Exportar reportes de negocio' },
  ];

  const permisosCreados = [];
  for (const item of permisosADefinir) {
    const permiso = await prisma.permiso.upsert({
      where: { codigo: item.codigo },
      update: { descripcion: item.descripcion },
      create: item,
    });
    permisosCreados.push(permiso);
  }
  console.log(`🛠️ Permisos básicos creados`);

  // 5. Vincular todos los permisos al rol ADMIN
  const adminRol = rolesCreados.find((r) => r.nombre === 'ADMIN');
  if (adminRol) {
    for (const permiso of permisosCreados) {
      await prisma.rolPermiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: adminRol.id,
            permisoId: permiso.id,
          },
        },
        update: {},
        create: {
          rolId: adminRol.id,
          permisoId: permiso.id,
        },
      });
    }
    console.log(`🔗 Permisos vinculados al rol ADMIN`);
  }

  // 6. Crear Usuario Administrador por Defecto
  const adminEmail = 'admin@rental.com';
  const adminPasswordHash = await argon2.hash('admin123'); // Contraseña por defecto

  const adminUser = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      empresaId: empresa.id,
      sucursalId: sucursal.id,
      email: adminEmail,
      password: adminPasswordHash,
      nombre: 'Administrador',
      apellido: 'Principal',
      activo: true,
      roles: {
        create: {
          rolId: adminRol!.id,
        },
      },
    },
  });
  console.log(`👤 Usuario Administrador creado: ${adminUser.email} (Contraseña: admin123)`);

  console.log('✅ Semillado finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el semillado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
