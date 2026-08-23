import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en .env');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando limpieza de cotizaciones y transacciones comerciales...');

  const deletedPagos = await prisma.pago.deleteMany({});
  console.log(`Pagos eliminados: ${deletedPagos.count}`);

  const deletedFacturas = await prisma.factura.deleteMany({});
  console.log(`Facturas eliminadas: ${deletedFacturas.count}`);

  const deletedDetalleDev = await prisma.detalleDevolucion.deleteMany({});
  console.log(`Detalles Devolución eliminados: ${deletedDetalleDev.count}`);

  const deletedDevoluciones = await prisma.devolucion.deleteMany({});
  console.log(`Devoluciones eliminadas: ${deletedDevoluciones.count}`);

  const deletedDetalleDesp = await prisma.detalleDespacho.deleteMany({});
  console.log(`Detalles Despacho eliminados: ${deletedDetalleDesp.count}`);

  const deletedDespachos = await prisma.despacho.deleteMany({});
  console.log(`Despachos eliminados: ${deletedDespachos.count}`);

  const deletedReservas = await prisma.reserva.deleteMany({});
  console.log(`Reservas eliminadas: ${deletedReservas.count}`);

  const deletedDetalleContrato = await prisma.detalleContrato.deleteMany({});
  console.log(`Detalles Contrato eliminados: ${deletedDetalleContrato.count}`);

  const deletedContratos = await prisma.contrato.deleteMany({});
  console.log(`Contratos eliminados: ${deletedContratos.count}`);

  const deletedDetalleCotizacion = await prisma.detalleCotizacion.deleteMany({});
  console.log(`Detalles Cotización eliminados: ${deletedDetalleCotizacion.count}`);

  const deletedCotizaciones = await prisma.cotizacion.deleteMany({});
  console.log(`Cotizaciones eliminadas: ${deletedCotizaciones.count}`);

  const deletedSolicitudes = await prisma.solicitud.deleteMany({});
  console.log(`Solicitudes eliminadas: ${deletedSolicitudes.count}`);

  console.log('✅ Limpieza completada con éxito. Clientes e Inventario se mantienen intactos.');
}

main()
  .catch((e) => {
    console.error('Error al limpiar base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
