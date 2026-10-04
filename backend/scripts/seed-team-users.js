require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Clave inicial aleatoria y distinta por usuario (el sufijo cumple la politica de complejidad).
function generarClaveInicial() {
  return crypto.randomBytes(18).toString('base64url') + '!Aa1';
}

// Resuelve empresa y sucursal por consulta: sin IDs fijos que fallan por FK en una BD nueva.
async function resolverEmpresaId() {
  const pedido = process.env.DEFAULT_EMPRESA_ID;
  if (pedido) {
    const e = await prisma.empresa.findUnique({ where: { id: pedido }, select: { id: true } });
    if (!e) throw new Error('DEFAULT_EMPRESA_ID no existe en la base de datos.');
    return e.id;
  }
  const empresas = await prisma.empresa.findMany({ select: { id: true }, take: 2 });
  if (empresas.length === 0) throw new Error('No hay ninguna empresa en la base. Ejecute primero el seed: npx prisma db seed.');
  if (empresas.length > 1) throw new Error('Hay mas de una empresa. Defina DEFAULT_EMPRESA_ID para elegir una.');
  return empresas[0].id;
}

async function resolverSucursalId(empresaId) {
  const pedido = process.env.DEFAULT_SUCURSAL_ID;
  if (pedido) {
    const s = await prisma.sucursal.findFirst({ where: { id: pedido, empresaId }, select: { id: true } });
    if (!s) throw new Error('DEFAULT_SUCURSAL_ID no existe o no pertenece a la empresa elegida.');
    return s.id;
  }
  const sucursales = await prisma.sucursal.findMany({ where: { empresaId }, select: { id: true }, take: 2 });
  if (sucursales.length === 0) throw new Error('La empresa no tiene sucursales. Ejecute primero el seed: npx prisma db seed.');
  if (sucursales.length > 1) throw new Error('La empresa tiene mas de una sucursal. Defina DEFAULT_SUCURSAL_ID para elegir una.');
  return sucursales[0].id;
}

async function main() {
  const empresaId = await resolverEmpresaId();
  const sucursalId = await resolverSucursalId(empresaId);
  console.log('Nota: las claves iniciales son aleatorias, distintas por usuario y no se muestran; restablezcalas desde la gestion de usuarios (admin).');

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
    const existente = await prisma.usuario.findUnique({
      where: { email: member.email },
      select: { id: true },
    });

    let user;
    if (existente) {
      // Usuario ya existente: NO se toca su clave ni su estado de bloqueo (re-ejecutar es seguro).
      user = await prisma.usuario.update({
        where: { id: existente.id },
        data: { nombre: member.nombre, apellido: member.apellido, empresaId, sucursalId },
      });
    } else {
      // Clave inicial aleatoria y DISTINTA por usuario; nunca se imprime, se registra ni se guarda.
      const passwordHash = await argon2.hash(generarClaveInicial());
      user = await prisma.usuario.create({
        data: {
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
    }

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
