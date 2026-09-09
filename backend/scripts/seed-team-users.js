require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const empresaId = 'fedb4b05-e281-4956-9367-5a0530976e60';
  const sucursalId = 'a98976b2-12ba-4995-a541-6526e0e68405';

  console.log('--- 1. Creando o verificando Roles en la Base de Datos ---');
  const rolesDef = [
    { nombre: 'ADMIN', descripcion: 'Administrador del sistema con acceso total' },
    { nombre: 'GERENTE', descripcion: 'Dirección ejecutiva, gerencia general y comercial' },
    { nombre: 'COMERCIAL', descripcion: 'Ventas, cotizaciones y atención directa a clientes' },
    { nombre: 'OPERACIONES', descripcion: 'Despachos, devoluciones, transporte y logística' },
    { nombre: 'FACTURACION', descripcion: 'Caja, facturación y cobranzas' },
    { nombre: 'CONTABILIDAD', descripcion: 'Contabilidad general, reportes financieros y balances' },
    { nombre: 'MANTENIMIENTO', descripcion: 'Taller mecánico, mantenimiento preventivo y correctivo' },
  ];

  const rolesMap = {};
  for (const r of rolesDef) {
    const rolDb = await prisma.rol.upsert({
      where: { nombre: r.nombre },
      update: { descripcion: r.descripcion },
      create: { nombre: r.nombre, descripcion: r.descripcion },
    });
    rolesMap[r.nombre] = rolDb.id;
    console.log(`Rol listo: ${r.nombre} (${rolDb.id})`);
  }

  console.log('\n--- 2. Creando los 11 Usuarios del Equipo BM Construcciones ---');
  const team = [
    {
      nombre: 'Isela Massiel',
      apellido: 'Vargas Sandoval',
      email: 'isela.vargas@rental.com.ni',
      passwordPlana: 'Operaciones2026!',
      roles: ['OPERACIONES'],
    },
    {
      nombre: 'Jairo Alfonso',
      apellido: 'Gutiérrez Castillo',
      email: 'jairo.gutierrez@rental.com.ni',
      passwordPlana: 'Taller2026!',
      roles: ['OPERACIONES', 'MANTENIMIENTO'],
    },
    {
      nombre: 'Carlos Juan',
      apellido: 'Sánchez Ríos',
      email: 'carlos.sanchez@rental.com.ni',
      passwordPlana: 'Ventas2026!',
      roles: ['GERENTE', 'COMERCIAL'],
    },
    {
      nombre: 'Bismarck Antonio',
      apellido: 'Murillo Montes',
      email: 'bismarck.murillo@rental.com.ni',
      passwordPlana: 'Gerencia2026!',
      roles: ['ADMIN', 'GERENTE'],
    },
    {
      nombre: 'Yahoska D´Trinidad',
      apellido: 'Guillen',
      email: 'yahoska.guillen@rental.com.ni',
      passwordPlana: 'ViceGerencia2026!',
      roles: ['GERENTE', 'ADMIN'],
    },
    {
      nombre: 'Liliana De Los Ángeles',
      apellido: 'Sevilla Rivera',
      email: 'liliana.sevilla@rental.com.ni',
      passwordPlana: 'Facturacion2026!',
      roles: ['FACTURACION'],
    },
    {
      nombre: 'Nylska Johanny',
      apellido: 'García Castillo',
      email: 'nylska.garcia@rental.com.ni',
      passwordPlana: 'Vendedora2026!',
      roles: ['COMERCIAL'],
    },
    {
      nombre: 'Arles David',
      apellido: 'Centeno',
      email: 'arles.centeno@rental.com.ni',
      passwordPlana: 'Vendedor2026!',
      roles: ['COMERCIAL'],
    },
    {
      nombre: 'Agnel Onmaybren',
      apellido: 'Castillo Moreno',
      email: 'agnel.castillo@rental.com.ni',
      passwordPlana: 'Vendedora2026!',
      roles: ['COMERCIAL'],
    },
    {
      nombre: 'Yessel Anahy De Fátima',
      apellido: 'Cerpas Artola',
      email: 'yessel.cerpas@rental.com.ni',
      passwordPlana: 'Vendedora2026!',
      roles: ['COMERCIAL'],
    },
    {
      nombre: 'Karla Vanessa',
      apellido: 'Joya Lazo',
      email: 'karla.joya@rental.com.ni',
      passwordPlana: 'Contabilidad2026!',
      roles: ['CONTABILIDAD'],
    },
  ];

  for (const member of team) {
    const passwordHash = await argon2.hash(member.passwordPlana);

    const user = await prisma.usuario.upsert({
      where: { email: member.email },
      update: {
        nombre: member.nombre,
        apellido: member.apellido,
        password: passwordHash,
        empresaId,
        sucursalId,
        activo: true,
        bloqueado: false,
        intentosFallidos: 0,
      },
      create: {
        empresaId,
        sucursalId,
        email: member.email,
        password: passwordHash,
        nombre: member.nombre,
        apellido: member.apellido,
        activo: true,
        bloqueado: false,
        intentosFallidos: 0,
      },
    });

    // Asignar roles al usuario
    await prisma.usuarioRol.deleteMany({ where: { usuarioId: user.id } });
    for (const rolNombre of member.roles) {
      const rolId = rolesMap[rolNombre];
      if (rolId) {
        await prisma.usuarioRol.create({
          data: {
            usuarioId: user.id,
            rolId,
          },
        });
      }
    }

    console.log(`Usuario creado/actualizado: ${member.nombre} ${member.apellido} <${member.email}> [Roles: ${member.roles.join(', ')}]`);
  }

  console.log('\n✅ Todos los 11 usuarios fueron creados exitosamente en la base de datos.');
}

main()
  .catch((e) => {
    console.error('Error al sembrar usuarios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
