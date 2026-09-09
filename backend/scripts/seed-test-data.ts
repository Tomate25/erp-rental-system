import { PrismaClient, TipoControlEquipo, EstadoEquipo } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const empresaId = 'fedb4b05-e281-4956-9367-5a0530976e60';
  const sucursalId = 'a98976b2-12ba-4995-a541-6526e0e68405';

  console.log('--- Creando 2 Clientes de Prueba ---');

  // Cliente 1
  const cliente1 = await prisma.cliente.upsert({
    where: { id: 'c1111111-1111-1111-1111-111111111111' },
    update: {
      nombre: 'Constructora Soluciones Globales S.A. (PRUEBA)',
      empresaId,
      limiteCredito: 25000,
      condicionPago: 'CREDITO_30_DIAS',
      emailFacturacion: 'contacto@solucionesglobales.test',
    },
    create: {
      id: 'c1111111-1111-1111-1111-111111111111',
      empresaId,
      numeroCliente: 'CLI-TEST-001',
      nombre: 'Constructora Soluciones Globales S.A. (PRUEBA)',
      razonSocial: 'Constructora Soluciones Globales S.A.',
      rfc: 'J031000000001',
      cedula: '001-010190-0001A',
      direccion: 'Km 5 Carretera a Masaya, Managua, Nicaragua',
      emailFacturacion: 'contacto@solucionesglobales.test',
      telefono: '+505 8888-1111',
      telClaro: '8888-1111',
      telMovistar: '8777-1111',
      limiteCredito: 25000,
      condicionPago: 'CREDITO_30_DIAS',
      whatsappHabilitado: true,
      whatsappNumero: '+50588881111',
      contactos: {
        create: [
          {
            nombre: 'Ing. Roberto Carlos Gómez',
            email: 'roberto.gomez@solucionesglobales.test',
            telefono: '+505 8888-1111',
            puesto: 'Gerente de Proyectos',
          },
        ],
      },
    },
  });
  console.log(`Cliente 1 creado: ${cliente1.nombre} (${cliente1.id})`);

  // Cliente 2
  const cliente2 = await prisma.cliente.upsert({
    where: { id: 'c2222222-2222-2222-2222-222222222222' },
    update: {
      nombre: 'Ingeniería y Pavimentos del Pacífico (PRUEBA)',
      empresaId,
      limiteCredito: 40000,
      condicionPago: 'CONTADO',
      emailFacturacion: 'adquisiciones@pavimentosdelpacifico.test',
    },
    create: {
      id: 'c2222222-2222-2222-2222-222222222222',
      empresaId,
      numeroCliente: 'CLI-TEST-002',
      nombre: 'Ingeniería y Pavimentos del Pacífico (PRUEBA)',
      razonSocial: 'Ingeniería y Pavimentos del Pacífico S.A.',
      rfc: 'J031000000002',
      cedula: '001-020290-0002B',
      direccion: 'Pista Jean Paul Genie, Edificio Prisma, Piso 3, Managua',
      emailFacturacion: 'adquisiciones@pavimentosdelpacifico.test',
      telefono: '+505 8888-2222',
      telClaro: '8888-2222',
      telConvencional: '2278-2222',
      limiteCredito: 40000,
      condicionPago: 'CONTADO',
      whatsappHabilitado: true,
      whatsappNumero: '+50588882222',
      contactos: {
        create: [
          {
            nombre: 'Lic. María Fernanda Rivas',
            email: 'maria.rivas@pavimentosdelpacifico.test',
            telefono: '+505 8888-2222',
            puesto: 'Jefe de Compras',
          },
        ],
      },
    },
  });
  console.log(`Cliente 2 creado: ${cliente2.nombre} (${cliente2.id})`);

  console.log('\n--- Creando 2 Productos / Equipos de Prueba con Stock de 5 ---');

  const catCompactacion = await prisma.categoria.findFirst({
    where: { nombre: { contains: 'COMPACTACION' } },
  });
  const catGeneradores = await prisma.categoria.findFirst({
    where: { nombre: { contains: 'GENERADORES' } },
  });
  const marcaWacker = await prisma.marca.findFirst({
    where: { nombre: { contains: 'WAKER' } },
  });
  const marcaMasalta = await prisma.marca.findFirst({
    where: { nombre: { contains: 'MASALTA' } },
  });

  if (!catCompactacion || !catGeneradores || !marcaWacker || !marcaMasalta) {
    throw new Error('Categorías o marcas requeridas no encontradas en base de datos');
  }

  // Producto 1
  const producto1 = await prisma.producto.upsert({
    where: { id: 'p1111111-1111-1111-1111-111111111111' },
    update: {
      nombre: 'Bailarina Compactadora Wacker Neuson BS50-2 (PRUEBA)',
      precioRentaDia: 45.0,
      precioRentaHora: 6.0,
    },
    create: {
      id: 'p1111111-1111-1111-1111-111111111111',
      empresaId,
      categoriaId: catCompactacion.id,
      marcaId: marcaWacker.id,
      codigo: 'PRD-TEST-01',
      nombre: 'Bailarina Compactadora Wacker Neuson BS50-2 (PRUEBA)',
      descripcion: 'Apisonador de impacto para compactación en zanjas y cimentaciones. Equipo de prueba con stock de 5 unidades.',
      tipoControl: TipoControlEquipo.POR_CANTIDAD,
      precioRentaDia: 45.0,
      precioRentaHora: 6.0,
      minimoHoras: 4,
    },
  });

  // Equipo 1 con Stock de 5
  const equipo1 = await prisma.equipo.upsert({
    where: { id: 'e1111111-1111-1111-1111-111111111111' },
    update: {
      cantidadTotal: 5,
      cantidadDisponible: 5,
      estado: EstadoEquipo.DISPONIBLE,
    },
    create: {
      id: 'e1111111-1111-1111-1111-111111111111',
      empresaId,
      sucursalId,
      productoId: producto1.id,
      categoriaId: catCompactacion.id,
      marcaId: marcaWacker.id,
      codigo: 'EQ-TEST-01',
      modelo: 'BS50-2',
      numeroSerie: 'SN-TEST-BS50-001',
      descripcion: 'Bailarina Compactadora Wacker Neuson BS50-2 (Lote de Prueba - 5 unidades disponibles)',
      tipoControl: TipoControlEquipo.POR_CANTIDAD,
      estado: EstadoEquipo.DISPONIBLE,
      cantidadTotal: 5,
      cantidadDisponible: 5,
      precioRentaDia: 45.0,
      precioRentaHora: 6.0,
      minimoHoras: 4,
      horometro: 120.5,
      horometroUltimoServicio: 100.0,
      intervaloServicioHoras: 250.0,
    },
  });
  console.log(`Producto y Equipo 1 creados: ${equipo1.modelo} (Stock Disp: ${equipo1.cantidadDisponible}/${equipo1.cantidadTotal})`);

  // Producto 2
  const producto2 = await prisma.producto.upsert({
    where: { id: 'p2222222-2222-2222-2222-222222222222' },
    update: {
      nombre: 'Generador Eléctrico Masalta 7.5 kVA Gasolina (PRUEBA)',
      precioRentaDia: 65.0,
      precioRentaHora: 8.5,
    },
    create: {
      id: 'p2222222-2222-2222-2222-222222222222',
      empresaId,
      categoriaId: catGeneradores.id,
      marcaId: marcaMasalta.id,
      codigo: 'PRD-TEST-02',
      nombre: 'Generador Eléctrico Masalta 7.5 kVA Gasolina (PRUEBA)',
      descripcion: 'Generador de energía de 7.5 kVA para iluminación y obras. Equipo de prueba con stock de 5 unidades.',
      tipoControl: TipoControlEquipo.POR_CANTIDAD,
      precioRentaDia: 65.0,
      precioRentaHora: 8.5,
      minimoHoras: 4,
    },
  });

  // Equipo 2 con Stock de 5
  const equipo2 = await prisma.equipo.upsert({
    where: { id: 'e2222222-2222-2222-2222-222222222222' },
    update: {
      cantidadTotal: 5,
      cantidadDisponible: 5,
      estado: EstadoEquipo.DISPONIBLE,
    },
    create: {
      id: 'e2222222-2222-2222-2222-222222222222',
      empresaId,
      sucursalId,
      productoId: producto2.id,
      categoriaId: catGeneradores.id,
      marcaId: marcaMasalta.id,
      codigo: 'EQ-TEST-02',
      modelo: 'MG7500E',
      numeroSerie: 'SN-TEST-MG75-002',
      descripcion: 'Generador Eléctrico Masalta 7.5 kVA (Lote de Prueba - 5 unidades disponibles)',
      tipoControl: TipoControlEquipo.POR_CANTIDAD,
      estado: EstadoEquipo.DISPONIBLE,
      cantidadTotal: 5,
      cantidadDisponible: 5,
      precioRentaDia: 65.0,
      precioRentaHora: 8.5,
      minimoHoras: 4,
      horometro: 45.0,
      horometroUltimoServicio: 0.0,
      intervaloServicioHoras: 250.0,
    },
  });
  console.log(`Producto y Equipo 2 creados: ${equipo2.modelo} (Stock Disp: ${equipo2.cantidadDisponible}/${equipo2.cantidadTotal})`);

  // Asegurar que el usuario activo tenga sucursalId asignado
  await prisma.usuario.updateMany({
    where: { email: 'abdiasl085@gmail.com' },
    data: { sucursalId },
  });
  console.log('Usuario abdiasl085@gmail.com sincronizado con la sucursal de la empresa.');
}

main()
  .catch((e) => {
    console.error('Error al insertar datos de prueba:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
