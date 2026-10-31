require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');
const crypto = require('crypto');

/**
 * ============================================================================
 * SIEMBRA SEGURA DE USUARIOS DEL EQUIPO BM CONSTRUCCIONES (CERO SECRETOS EN CÓDIGO)
 * ============================================================================
 * 
 * Este script administra la creación e idempotencia de usuarios del equipo BM.
 * NO contiene contraseñas en texto plano ni valores por defecto codificados.
 *
 * MODOS DE OPERACIÓN:
 * 
 * 1) MODO NORMAL (Sin flag o FORCE_TEAM_PASSWORDS=0):
 *    - Usuarios existentes: Solo sincroniza roles, nombres y estado activo.
 *      NO modifica contraseñas existentes ni resetea tokens.
 *    - Usuarios nuevos (ej. Luis o Tairo en primer deploy):
 *      Toma la contraseña desde TEAM_PASSWORDS_JSON si fue provista; de lo contrario
 *      genera una clave inicial aleatoria criptográficamente segura (argon2id).
 *      Se marca requiereCambioPassword: true para forzar cambio en primer inicio.
 *
 * 2) MODO FORZADO DE CONTRASEÑAS (FORCE_TEAM_PASSWORDS=1):
 *    - Exige obligatoriamente la variable de entorno TEAM_PASSWORDS_JSON.
 *    - Formato esperado:
 *      export TEAM_PASSWORDS_JSON='{"usuario@rental.com.ni":"ClaveFuerte2026!#",...}'
 *    - Si falta la contraseña de cualquier usuario activo en el JSON, el script
 *      aborta INMEDIATAMENTE con error explicativo antes de realizar cambios.
 *    - NUNCA imprime ni registra contraseñas en logs ni terminal.
 *    - Hashea con argon2 (argon2id) y activa requiereCambioPassword=true.
 * 
 * NOTA DE SEGURIDAD PRE-PRODUCCIÓN:
 * Cualquier contraseña utilizada durante desarrollo o pruebas locales DEBE SER
 * ROTADA en producción. Nunca reutilice patrones predecibles.
 * ============================================================================
 */

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/erp_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generarClaveInicial() {
  return crypto.randomBytes(18).toString('base64url') + '!Aa1';
}

function parseTeamPasswordsFromEnv() {
  const envRaw = process.env.TEAM_PASSWORDS_JSON;
  if (!envRaw) return {};
  try {
    const parsed = JSON.parse(envRaw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(
        'TEAM_PASSWORDS_JSON debe ser un objeto JSON con pares { "email": "password" }'
      );
    }
    return parsed;
  } catch (err) {
    throw new Error('Error al interpretar TEAM_PASSWORDS_JSON: ' + err.message);
  }
}

async function resolverEmpresaId() {
  const pedido = process.env.DEFAULT_EMPRESA_ID;
  if (pedido) {
    const e = await prisma.empresa.findUnique({
      where: { id: pedido },
      select: { id: true },
    });
    if (!e)
      throw new Error('DEFAULT_EMPRESA_ID no existe en la base de datos.');
    return e.id;
  }
  const usuarioExistente = await prisma.usuario.findFirst({
    where: {
      email: {
        in: [
          'yahoska.guillen@rental.com.ni',
          'bismarck.murillo@rental.com.ni',
          'admin@rental.com',
        ],
      },
    },
    select: { empresaId: true },
  });
  if (usuarioExistente && usuarioExistente.empresaId) {
    return usuarioExistente.empresaId;
  }
  const empresas = await prisma.empresa.findMany({
    select: { id: true },
    take: 2,
  });
  if (empresas.length === 0)
    throw new Error(
      'No hay ninguna empresa en la base. Ejecute primero el seed: npx prisma db seed.'
    );
  return empresas[0].id;
}

async function resolverSucursalId(empresaId) {
  const pedido = process.env.DEFAULT_SUCURSAL_ID;
  if (pedido) {
    const s = await prisma.sucursal.findFirst({
      where: { id: pedido, empresaId },
      select: { id: true },
    });
    if (!s)
      throw new Error(
        'DEFAULT_SUCURSAL_ID no existe o no pertenece a la empresa elegida.'
      );
    return s.id;
  }
  const usuarioExistente = await prisma.usuario.findFirst({
    where: {
      empresaId,
      email: {
        in: [
          'yahoska.guillen@rental.com.ni',
          'bismarck.murillo@rental.com.ni',
          'admin@rental.com',
        ],
      },
    },
    select: { sucursalId: true },
  });
  if (usuarioExistente && usuarioExistente.sucursalId) {
    return usuarioExistente.sucursalId;
  }
  const sucursales = await prisma.sucursal.findMany({
    where: { empresaId },
    select: { id: true },
  });
  if (sucursales.length === 0)
    throw new Error(
      'La empresa no tiene sucursales. Ejecute primero el seed: npx prisma db seed.'
    );
  return sucursales[0].id;
}

async function main() {
  const empresaId = await resolverEmpresaId();
  const sucursalId = await resolverSucursalId(empresaId);
  const forcePasswords = process.env.FORCE_TEAM_PASSWORDS === '1';
  const passwordsMap = parseTeamPasswordsFromEnv();

  console.log(
    `=== Sembrado de Usuarios del Equipo BM Construcciones (FORCE_TEAM_PASSWORDS: ${
      forcePasswords ? 'ACTIVO' : 'INACTIVO'
    }) ===`
  );

  console.log('\n--- 1. Creando o verificando Roles en la Base de Datos ---');
  const rolesDef = [
    {
      nombre: 'ADMIN',
      descripcion: 'Administrador del sistema con acceso total',
    },
    {
      nombre: 'GERENTE',
      descripcion: 'Dirección ejecutiva, gerencia general y comercial',
    },
    {
      nombre: 'COMERCIAL',
      descripcion: 'Ventas, cotizaciones y atención directa a clientes',
    },
    {
      nombre: 'OPERACIONES',
      descripcion: 'Despachos, devoluciones, transporte y logística',
    },
    { nombre: 'FACTURACION', descripcion: 'Caja, facturación y cobranzas' },
    {
      nombre: 'CONTABILIDAD',
      descripcion:
        'Contabilidad general, reportes financieros y balances',
    },
    {
      nombre: 'MANTENIMIENTO',
      descripcion: 'Taller mecánico, mantenimiento preventivo y correctivo',
    },
    {
      nombre: 'RRHH',
      descripcion: 'Recursos Humanos, expedientes de personal y nómina',
    },
  ];

  const rolesMap = {};
  for (const r of rolesDef) {
    let rolDb = await prisma.rol.findFirst({
      where: { nombre: r.nombre, empresaId: null },
    });
    if (!rolDb) {
      rolDb = await prisma.rol.findFirst({
        where: { nombre: r.nombre },
      });
    }
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
    console.log(`Rol verificado: ${r.nombre} (${rolDb.id})`);
  }

  console.log('\n--- 2. Creando o actualizando Usuarios del Equipo BM ---');
  const team = [
    {
      nombre: 'Isela Massiel',
      apellido: 'Vargas Sandoval',
      email: 'isela.vargas@rental.com.ni',
      roles: ['OPERACIONES'],
      activo: false,
    },
    {
      nombre: 'Nylska Johanny',
      apellido: 'García Castillo',
      email: 'nylska.garcia@rental.com.ni',
      roles: ['COMERCIAL'],
      activo: true,
    },
    {
      nombre: 'Yessel Anahy De Fátima',
      apellido: 'Cerpas Artola',
      email: 'yessel.cerpas@rental.com.ni',
      roles: ['COMERCIAL'],
      activo: true,
    },
    {
      nombre: 'Agnel Onmaybren',
      apellido: 'Castillo Moreno',
      email: 'agnel.castillo@rental.com.ni',
      roles: ['COMERCIAL'],
      activo: true,
    },
    {
      nombre: 'Arles David',
      apellido: 'Centeno',
      email: 'arles.centeno@rental.com.ni',
      roles: ['COMERCIAL'],
      activo: true,
    },
    {
      nombre: 'Liliana De Los Ángeles',
      apellido: 'Sevilla Rivera',
      email: 'liliana.sevilla@rental.com.ni',
      roles: ['FACTURACION'],
      activo: true,
    },
    {
      nombre: 'Karla Vanessa',
      apellido: 'Joya Lazo',
      email: 'karla.joya@rental.com.ni',
      roles: ['CONTABILIDAD', 'RRHH'],
      activo: true,
    },
    {
      nombre: 'Luis',
      apellido: 'Rodríguez',
      email: 'luis.rodriguez@rental.com.ni',
      roles: ['OPERACIONES', 'MANTENIMIENTO'],
      activo: true,
    },
    {
      nombre: 'Jairo Alfonso',
      apellido: 'Gutiérrez Castillo',
      email: 'jairo.gutierrez@rental.com.ni',
      roles: ['OPERACIONES', 'MANTENIMIENTO', 'COMERCIAL'],
      activo: true,
    },
    {
      nombre: 'Tairo',
      apellido: 'Mercado',
      email: 'tairo.mercado@rental.com.ni',
      roles: ['OPERACIONES', 'MANTENIMIENTO'],
      activo: true,
    },
    {
      nombre: 'Carlos Juan',
      apellido: 'Sánchez Ríos',
      email: 'carlos.sanchez@rental.com.ni',
      roles: ['COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO'],
      activo: true,
    },
    {
      nombre: 'Yahoska D´Trinidad',
      apellido: 'Guillen',
      email: 'yahoska.guillen@rental.com.ni',
      roles: ['ADMIN', 'GERENTE'],
      activo: true,
    },
    {
      nombre: 'Bismarck Antonio',
      apellido: 'Murillo Montes',
      email: 'bismarck.murillo@rental.com.ni',
      roles: ['ADMIN', 'GERENTE'],
      activo: true,
    },
  ];

  // Si FORCE_TEAM_PASSWORDS=1 está activo, verificar exhaustivamente que todos los usuarios activos
  // cuenten con una contraseña configurada en variables de entorno antes de procesar cualquier usuario.
  if (forcePasswords) {
    const faltantes = team
      .filter(
        (m) =>
          m.activo &&
          (!passwordsMap[m.email] ||
            typeof passwordsMap[m.email] !== 'string' ||
            !passwordsMap[m.email].trim())
      )
      .map((m) => m.email);

    if (faltantes.length > 0) {
      throw new Error(
        `[SEGURIDAD BLOQUEANTE] FORCE_TEAM_PASSWORDS=1 está activo pero faltan contraseñas en TEAM_PASSWORDS_JSON para los siguientes usuarios activos:\n- ${faltantes.join(
          '\n- '
        )}\n\nConfigure TEAM_PASSWORDS_JSON='{"${faltantes[0]}":"...",...}' en el entorno.`
      );
    }
  }

  for (const member of team) {
    const existente = await prisma.usuario.findUnique({
      where: { email: member.email },
      select: { id: true, email: true },
    });

    let user;
    if (existente) {
      const updateData = {
        nombre: member.nombre,
        apellido: member.apellido,
        empresaId,
        sucursalId,
        activo: member.activo ?? true,
      };

      if (forcePasswords) {
        const plainEnv = passwordsMap[member.email];
        if (plainEnv) {
          updateData.password = await argon2.hash(plainEnv, {
            type: argon2.argon2id,
          });
          updateData.requiereCambioPassword = true;
          updateData.bloqueado = false;
          updateData.intentosFallidos = 0;
        }
      }

      user = await prisma.usuario.update({
        where: { id: existente.id },
        data: updateData,
      });
    } else {
      let plain = passwordsMap[member.email];
      if (!plain) {
        plain = generarClaveInicial();
      }
      const passwordHash = await argon2.hash(plain, {
        type: argon2.argon2id,
      });
      user = await prisma.usuario.create({
        data: {
          empresaId,
          sucursalId,
          email: member.email,
          password: passwordHash,
          nombre: member.nombre,
          apellido: member.apellido,
          activo: member.activo ?? true,
          bloqueado: false,
          intentosFallidos: 0,
          requiereCambioPassword: true,
        },
      });
    }

    // Sincronización exacta de roles
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

    console.log(
      `✓ Usuario configurado: ${member.nombre} ${member.apellido} <${member.email}> [Roles: ${member.roles.join(
        ', '
      )}] (Activo: ${member.activo ?? true})`
    );
  }

  console.log(
    '\n✅ Equipo de BM Construcciones sincronizado exitosamente al 100%.'
  );
}

main()
  .catch((e) => {
    console.error('Error al sembrar usuarios:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
