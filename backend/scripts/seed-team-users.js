require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Falla antes de tocar la BD si falta la clave inicial del equipo (no hay valor por defecto).
  const initialUserPassword = process.env.INITIAL_USER_PASSWORD;
  if (!initialUserPassword) {
    throw new Error('Falta la variable de entorno INITIAL_USER_PASSWORD (clave inicial de los usuarios del equipo). Defina INITIAL_USER_PASSWORD antes de ejecutar este script; no existe valor por defecto.');
  }

  const empresaId = process.env.DEFAULT_EMPRESA_ID || 'fedb4b05-e281-4956-9367-5a0530976e60';
  const sucursalId = process.env.DEFAULT_SUCURSAL_ID || 'a98976b2-12ba-4995-a541-6526e0e68405';

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
    let rolDb = await prisma.rol.findFirst({
      where: { nombre: r.nombre, empresaId: null },
    });
    if (!rolDb) {
      rolDb = await prisma.rol.create({
        data: { nombre: r.nombre, descripcion: r.descripcion, empresaId: null },
      });
    } else {
      rolDb = await prisma.rol.update({
        where: { id: rolDb.id },
        data: { descripcion: r.descripcion },
      });
    }
    rolesMap[r.nombre] = rolDb.id;
    console.log(`Rol listo: ${r.nombre} (${rolDb.id})`);
  }

  console.log('\n--- 2. Creando los 11 Usuarios del Equipo BM Construcciones ---');
  const team = [
    {
      nombre: 'Isela Massiel',
      apellido: 'Vargas Sandoval',
      email: 'isela.vargas@rental.com.ni',
      roles: ['OPERACIONES'],
    },
    {
      nombre: 'Jairo Alfonso',
      apellido: 'Gutiérrez Castillo',
      email: 'jairo.gutierrez@rental.com.ni',
      roles: ['OPERACIONES', 'MANTENIMIENTO'],
    },
    {
      nombre: 'Carlos Juan',
      apellido: 'Sánchez Ríos',
      email: 'carlos.sanchez@rental.com.ni',
      roles: ['GERENTE', 'COMERCIAL'],
    },
    {
      nombre: 'Bismarck Antonio',
      apellido: 'Murillo Montes',
      email: 'bismarck.murillo@rental.com.ni',
      roles: ['ADMIN', 'GERENTE'],
    },
    {
      nombre: 'Yahoska D´Trinidad',
      apellido: 'Guillen',
      email: 'yahoska.guillen@rental.com.ni',
      roles: ['GERENTE', 'ADMIN'],
    },
    {
      nombre: 'Liliana De Los Ángeles',
      apellido: 'Sevilla Rivera',
      email: 'liliana.sevilla@rental.com.ni',
      roles: ['FACTURACION'],
    },
    {
      nombre: 'Nylska Johanny',
      apellido: 'García Castillo',
      email: 'nylska.garcia@rental.com.ni',
      roles: ['COMERCIAL'],
    },
    {
      nombre: 'Arles David',
      apellido: 'Centeno',
      email: 'arles.centeno@rental.com.ni',
      roles: ['COMERCIAL'],
    },
    {
      nombre: 'Agnel Onmaybren',
      apellido: 'Castillo Moreno',
      email: 'agnel.castillo@rental.com.ni',
      roles: ['COMERCIAL'],
    },
    {
      nombre: 'Yessel Anahy De Fátima',
      apellido: 'Cerpas Artola',
      email: 'yessel.cerpas@rental.com.ni',
      roles: ['COMERCIAL'],
    },
    {
      nombre: 'Karla Vanessa',
      apellido: 'Joya Lazo',
      email: 'karla.joya@rental.com.ni',
      roles: ['CONTABILIDAD'],
    },
  ];

  for (const member of team) {
    const rawPass = initialUserPassword;
    const passwordHash = await argon2.hash(rawPass);

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
        requiereCambioPassword: true,
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
        requiereCambioPassword: true,
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

    console.log(`Usuario creado/actualizado: ${member.nombre} ${member.apellido} <${member.email}> [Roles: ${member.roles.join(', ')}] (requiere cambio de contraseña)`);
  }

  console.log('\n✅ Todos los 11 usuarios fueron configurados de forma segura con reseteo obligatorio de contraseña.');
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
