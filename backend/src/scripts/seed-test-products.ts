import { PrismaClient, EstadoEquipo, TipoControlEquipo } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedTestProducts() {
  console.log('🚜 Creando productos de prueba "Prueba 1" (Por Día) y "Prueba 2" (Por Hora)...');

  try {
    // 1. Obtener o crear Empresa y Sucursal
    let empresa = await prisma.empresa.findFirst();
    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          nombre: 'BM Construcciones S.A.',
          rfc: 'J0310000000000',
          email: 'contacto@bmconstrucciones.com',
          telefono: '2222-0000'
        }
      });
    }

    let sucursal = await prisma.sucursal.findFirst({ where: { empresaId: empresa.id } });
    if (!sucursal) {
      sucursal = await prisma.sucursal.create({
        data: {
          empresaId: empresa.id,
          codigo: 'SUC-01',
          nombre: 'Sucursal Central Managua',
          direccion: 'Km 5 Carretera Norte, Managua'
        }
      });
    }

    // 2. Obtener o crear Categoría y Marca
    let categoria = await prisma.categoria.findFirst();
    if (!categoria) {
      categoria = await prisma.categoria.create({
        data: {
          nombre: 'Maquinaria Pesada',
          descripcion: 'Equipos de construcción e ingeniería',
          isLineaAmarilla: true
        }
      });
    }

    let marca = await prisma.marca.findFirst();
    if (!marca) {
      marca = await prisma.marca.create({
        data: {
          nombre: 'CATERPILLAR'
        }
      });
    }

    // 3. Crear Producto "Prueba 1" (Renta por Día)
    console.log('📌 Creando Producto y Equipo "Prueba 1" (Tarifa Renta por DÍA)...');
    const prod1 = await prisma.producto.create({
      data: {
        empresaId: empresa.id,
        categoriaId: categoria.id,
        marcaId: marca.id,
        codigo: 'PRU-01',
        nombre: 'Prueba 1 (Renta por Día)',
        descripcion: 'Equipo de prueba configurado con tarifa por Día',
        tipoControl: TipoControlEquipo.SERIALIZADO,
        precioRentaDia: 1500.00,
        precioRentaHora: null
      }
    });

    const equipo1 = await prisma.equipo.create({
      data: {
        empresaId: empresa.id,
        sucursalId: sucursal.id,
        productoId: prod1.id,
        categoriaId: categoria.id,
        marcaId: marca.id,
        codigo: 'EQ-PRU-01',
        modelo: 'Prueba 1',
        numeroSerie: 'SN-PRUEBA-01-DIA',
        descripcion: 'Maquinaria Prueba 1 (Renta por Día)',
        estado: EstadoEquipo.DISPONIBLE,
        cantidadTotal: 1,
        cantidadDisponible: 1,
        horometro: 120.0,
        precioRentaDia: 1500.00,
        precioRentaHora: null
      }
    });

    // 4. Crear Producto "Prueba 2" (Renta por Hora)
    console.log('📌 Creando Producto y Equipo "Prueba 2" (Tarifa Renta por HORA)...');
    const prod2 = await prisma.producto.create({
      data: {
        empresaId: empresa.id,
        categoriaId: categoria.id,
        marcaId: marca.id,
        codigo: 'PRU-02',
        nombre: 'Prueba 2 (Renta por Hora)',
        descripcion: 'Equipo de prueba configurado con tarifa por Hora',
        tipoControl: TipoControlEquipo.SERIALIZADO,
        precioRentaDia: 2500.00,
        precioRentaHora: 350.00,
        minimoHoras: 4
      }
    });

    const equipo2 = await prisma.equipo.create({
      data: {
        empresaId: empresa.id,
        sucursalId: sucursal.id,
        productoId: prod2.id,
        categoriaId: categoria.id,
        marcaId: marca.id,
        codigo: 'EQ-PRU-02',
        modelo: 'Prueba 2',
        numeroSerie: 'SN-PRUEBA-02-HORA',
        descripcion: 'Maquinaria Prueba 2 (Renta por Hora)',
        estado: EstadoEquipo.DISPONIBLE,
        cantidadTotal: 1,
        cantidadDisponible: 1,
        horometro: 45.0,
        precioRentaDia: 2500.00,
        precioRentaHora: 350.00,
        minimoHoras: 4
      }
    });

    console.log('✅ Creados con éxito:');
    console.log(` 1. ${equipo1.modelo} (Serie: ${equipo1.numeroSerie}) -> Tarifa Día: C$ ${equipo1.precioRentaDia}/día`);
    console.log(` 2. ${equipo2.modelo} (Serie: ${equipo2.numeroSerie}) -> Tarifa Hora: C$ ${equipo2.precioRentaHora}/hr (Tarifa Día: C$ ${equipo2.precioRentaDia}/día)`);
  } catch (error) {
    console.error('❌ Error al crear productos de prueba:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedTestProducts();
