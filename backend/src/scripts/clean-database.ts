import { PrismaClient, EstadoEquipo } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDatabaseForFreshProcess() {
  console.log('🔄 Iniciando limpieza de base de datos para reinicio de circuito...');

  try {
    // 1. Eliminar inspecciones, devoluciones y despachos
    console.log('🧹 Limpiando Inspecciones, Devoluciones y Despachos...');
    await prisma.inspeccionDano.deleteMany();
    await prisma.detalleDevolucion.deleteMany();
    await prisma.devolucion.deleteMany();
    await prisma.detalleDespacho.deleteMany();
    await prisma.despacho.deleteMany();
    await prisma.solicitudRetorno.deleteMany();
    await prisma.solicitudDespacho.deleteMany();

    // 2. Eliminar Mantenimientos y Lecturas de Horómetros
    console.log('🧹 Limpiando Mantenimientos y Lecturas de Horómetros...');
    await prisma.mantenimiento.deleteMany();
    await prisma.lecturaHorometro.deleteMany();

    // 3. Eliminar Financiero (Pagos, Facturas y Cortes de Facturación)
    console.log('🧹 Limpiando Pagos, Facturas y Cortes de Facturación...');
    await prisma.pago.deleteMany();
    await prisma.factura.deleteMany();
    await prisma.corteFacturacion.deleteMany();

    // 4. Eliminar Contratos, Cotizaciones y Reservas
    console.log('🧹 Limpiando Contratos, Cotizaciones, Reservas y Solicitudes...');
    await prisma.reserva.deleteMany();
    await prisma.detalleContrato.deleteMany();
    await prisma.contrato.deleteMany();
    await prisma.detalleCotizacion.deleteMany();
    await prisma.cotizacion.deleteMany();
    await prisma.solicitud.deleteMany();

    // 5. Restablecer Estado del Inventario (Maquinaria y Equipos a DISPONIBLE)
    console.log('🚜 Restableciendo estados de Inventario a DISPONIBLE...');
    await prisma.equipo.updateMany({
      data: {
        estado: EstadoEquipo.DISPONIBLE,
        cantidadDisponible: 1
      }
    });

    console.log('✅ Base de datos restaurada con éxito.');
    console.log('📌 Preservados: Clientes, Catálogo de Inventarios (Maquinaria), Usuarios, Empresas y Sucursales.');
    console.log('🚀 Listo para probar el circuito desde Cotización ➔ Contrato ➔ Cortes ➔ Facturación ➔ CxC.');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

cleanDatabaseForFreshProcess();
