import { Prisma } from '@prisma/client';
import { QuotationsService } from './quotations.service';
import { resolveQuotationEquipment } from '../../contracts/utils/resolve-quotation-equipment';

/**
 * createNewVersion debe copiar TODA la linea de tarifa. Antes perdia tipoCobro,
 * horas y productoId: una cotizacion por hora versionada volvia a POR_DIA y, al
 * aceptarse, las horas se trataban como dias (x24 en el monto).
 */
describe('QuotationsService.createNewVersion conserva las lineas de tarifa', () => {
  const lineaHora = {
    id: 'det-1', cotizacionId: 'cot-a',
    productoId: 'prod-1', equipoId: 'eq-1', descripcion: 'Retroexcavadora por hora',
    tipoCobro: 'POR_HORA', cantidad: 2,
    dias: new Prisma.Decimal('8'), horas: new Prisma.Decimal('8'),
    precioUnitario: new Prisma.Decimal('50'), descuento: new Prisma.Decimal('0'),
    subtotal: new Prisma.Decimal('800'),
  };
  const lineaDia = {
    id: 'det-2', cotizacionId: 'cot-a',
    productoId: null, equipoId: 'eq-2', descripcion: 'Andamio por dia',
    tipoCobro: 'POR_DIA', cantidad: 1,
    dias: new Prisma.Decimal('3'), horas: null,
    precioUnitario: new Prisma.Decimal('100'), descuento: new Prisma.Decimal('0'),
    subtotal: new Prisma.Decimal('300'),
  };

  function armar() {
    const existing: any = {
      id: 'cot-a', empresaId: 'A', clienteId: 'cli-1', numeroCotizacion: 'COT-0001',
      version: 1, validezDias: 15, items: [lineaHora, lineaDia],
    };
    const tx: any = {
      cotizacion: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'cot-a2', empresaId: 'A', numeroCotizacion: 'COT-0001', version: 2, items: data.items.create,
        })),
        update: jest.fn(),
      },
      auditoria: { create: jest.fn() },
    };
    const prisma: any = {
      cotizacion: { findFirst: jest.fn().mockResolvedValue(existing) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    return { tx, service: new QuotationsService(prisma) };
  }

  it('copia tipoCobro, horas y productoId de las lineas', async () => {
    const { tx, service } = armar();
    await service.createNewVersion('cot-a', 'A');
    const [hora, dia] = tx.cotizacion.create.mock.calls[0][0].data.items.create;
    expect(hora).toMatchObject({
      productoId: 'prod-1', equipoId: 'eq-1', tipoCobro: 'POR_HORA', cantidad: 2,
    });
    expect(Number(hora.horas)).toBe(8);
    expect(Number(hora.dias)).toBe(8);
    expect(dia).toMatchObject({ tipoCobro: 'POR_DIA', equipoId: 'eq-2' });
    expect(dia.productoId).toBeUndefined();
    expect(dia.horas).toBeNull();
  });

  it('no pierde ningun campo de la linea (todos los escalares salvo id y cotizacionId)', async () => {
    const { tx, service } = armar();
    await service.createNewVersion('cot-a', 'A');
    const [hora] = tx.cotizacion.create.mock.calls[0][0].data.items.create;
    const escalares = Object.keys(Prisma.DetalleCotizacionScalarFieldEnum).filter(
      (c) => c !== 'id' && c !== 'cotizacionId',
    );
    expect(escalares.sort()).toEqual(
      ['cantidad', 'descripcion', 'descuento', 'dias', 'equipoId', 'horas', 'precioUnitario', 'productoId', 'subtotal', 'tipoCobro'].sort(),
    );
    for (const campo of escalares) expect(hora).toHaveProperty(campo);
  });

  it('al aceptar la version nueva la linea por hora sigue siendo HORA (8 h, no 8 x 24)', async () => {
    const { tx, service } = armar();
    const nueva = await service.createNewVersion('cot-a', 'A');
    const tx2: any = {
      sucursal: { findFirst: jest.fn().mockResolvedValue({ id: 'suc-a' }) },
      equipo: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'eq-1', tipoControl: 'SERIALIZADO', horometro: 0 },
          { id: 'eq-2', tipoControl: 'SERIALIZADO', horometro: 0 },
        ]),
      },
    };
    const [l1, l2] = await resolveQuotationEquipment(tx2, nueva.items as any, 'A', 'suc-a');
    expect(l1.tipoTarifa).toBe('HORA');
    expect(l1.horasPactadas).toBe(8);
    expect(l1.dias).toBe(8);
    expect(l2.tipoTarifa).toBe('DIA');
    expect(l2.dias).toBe(3);
    expect(l2.horasPactadas).toBeNull();
    expect(tx.cotizacion.update).toHaveBeenCalled();
  });
});
