import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoCotizacion } from '@prisma/client';
import { BillingService } from './billing/billing.service';
import { QuotationsService } from './quotations/services/quotations.service';
import { RolesService } from './roles/services/roles.service';

/**
 * Aislamiento multi-tenant: un empresaId ausente NUNCA debe omitir el filtro
 * (en Prisma `undefined` = sin filtro) y la empresa A no ve datos de la B.
 */
type Registro = { id: string; empresaId: string | null; numeroCotizacion?: string };

function coincide(registro: Registro & Record<string, any>, where: any): boolean {
  if (where.id && where.id !== registro.id) return false;
  if (where.numeroCotizacion && where.numeroCotizacion !== registro.numeroCotizacion) {
    return false;
  }
  if (where.OR) {
    return where.OR.some(
      (cond: any) =>
        cond.empresaId === registro.empresaId ||
        cond.cliente?.empresaId === registro.clienteEmpresaId,
    );
  }
  return true;
}

describe('Aislamiento multi-tenant en servicios (empresa A vs B)', () => {
  const cotizaciones = [
    { id: 'cot-a', empresaId: 'A', clienteEmpresaId: 'A', numeroCotizacion: 'COT-0001' },
    { id: 'cot-b', empresaId: 'B', clienteEmpresaId: 'B', numeroCotizacion: 'COT-0001' },
  ];
  const facturas = [
    { id: 'fac-a', empresaId: 'A', clienteEmpresaId: 'A', estado: 'PENDIENTE', total: 100, pagos: [] },
    { id: 'fac-b', empresaId: 'B', clienteEmpresaId: 'B', estado: 'PENDIENTE', total: 100, pagos: [] },
  ];
  let prisma: any;

  beforeEach(() => {
    prisma = {
      cotizacion: {
        findFirst: jest.fn(async ({ where }) => cotizaciones.find((c) => coincide(c, where)) ?? null),
        findMany: jest.fn(async ({ where }) => cotizaciones.filter((c) => coincide(c, where))),
      },
      factura: {
        findFirst: jest.fn(async ({ where }) => facturas.find((c) => coincide(c, where)) ?? null),
        findMany: jest.fn(async ({ where }) => facturas.filter((c) => coincide(c, where))),
      },
      corteFacturacion: { findFirst: jest.fn(), findMany: jest.fn(async () => []) },
      devolucion: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
      rol: { findUnique: jest.fn() },
      $executeRaw: jest.fn(),
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
  });

  describe('QuotationsService', () => {
    it('findOne: A no ve cotización de B y B sí ve la suya', async () => {
      const service = new QuotationsService(prisma);
      await expect(service.findOne('cot-b', 'A')).rejects.toThrow(NotFoundException);
      await expect((await service.findOne('cot-b', 'B')).id).toBe('cot-b');
      await expect((await service.findOne('cot-a', 'A')).id).toBe('cot-a');
    });

    it('findOne/findAll/findByNumero/findVersionsByNumber rechazan empresaId ausente', async () => {
      const service = new QuotationsService(prisma);
      await expect(service.findOne('cot-a', undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.findAll(undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.findByNumero('COT-0001', undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.findVersionsByNumber('COT-0001', '' as any)).rejects.toThrow(ForbiddenException);
      expect(prisma.cotizacion.findFirst).not.toHaveBeenCalled();
      expect(prisma.cotizacion.findMany).not.toHaveBeenCalled();
    });

    it('findAll y findVersionsByNumber solo devuelven la empresa consultante', async () => {
      const service = new QuotationsService(prisma);
      expect((await service.findAll('A')).map((c: any) => c.id)).toEqual(['cot-a']);
      expect((await service.findVersionsByNumber('COT-0001', 'B')).map((c: any) => c.id)).toEqual(['cot-b']);
      expect((await service.findByNumero('COT-0001', 'A')).id).toBe('cot-a');
    });
  });

  describe('BillingService', () => {
    it('getInvoices solo lista facturas de la empresa; sin empresaId falla cerrado', async () => {
      const service = new BillingService(prisma);
      expect((await service.getInvoices('A')).map((f: any) => f.id)).toEqual(['fac-a']);
      await expect(service.getInvoices(undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('registerPayment / markAsPaid no operan sobre facturas de otra empresa', async () => {
      const service = new BillingService(prisma);
      await expect(service.registerPayment('fac-b', { monto: 10 } as any, 'A')).rejects.toThrow(NotFoundException);
      await expect(service.markAsPaid('fac-b', 'A')).rejects.toThrow(NotFoundException);
      await expect(service.registerPayment('fac-b', { monto: 10 } as any, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.markAsPaid('fac-b', undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('getPendingQuotations, invoiceQuotation e invoiceCorte exigen empresaId', async () => {
      const service = new BillingService(prisma);
      await expect(service.getPendingQuotations(undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.invoiceQuotation('cot-a', {} as any, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.invoiceCorte('corte-1', {} as any, undefined as any)).rejects.toThrow(ForbiddenException);
      expect(prisma.corteFacturacion.findFirst).not.toHaveBeenCalled();
    });

    it('getPendingCortes: sin empresaId falla cerrado y no consulta la BD; con empresaId filtra por empresa', async () => {
      const service = new BillingService(prisma);
      await expect(service.getPendingCortes(undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.getPendingCortes('' as any)).rejects.toThrow(ForbiddenException);
      expect(prisma.corteFacturacion.findMany).not.toHaveBeenCalled();

      await service.getPendingCortes('A');
      expect(prisma.corteFacturacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contrato: { sucursal: { empresaId: 'A' } },
          }),
        }),
      );
    });

    it('getContractCortes: sin empresaId falla cerrado y no consulta la BD; con empresaId filtra por empresa', async () => {
      const service = new BillingService(prisma);
      await expect(service.getContractCortes(undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.getContractCortes(null as any)).rejects.toThrow(ForbiddenException);
      expect(prisma.corteFacturacion.findMany).not.toHaveBeenCalled();

      await service.getContractCortes('A');
      expect(prisma.corteFacturacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contrato: { sucursal: { empresaId: 'A' } },
          }),
        }),
      );
    });

    it('getDamageReturns: sin empresaId falla cerrado y no consulta la BD; con empresaId filtra por empresa', async () => {
      const service = new BillingService(prisma);
      await expect(service.getDamageReturns(undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.getDamageReturns('  ' as any)).rejects.toThrow(ForbiddenException);
      expect(prisma.devolucion.findMany).not.toHaveBeenCalled();

      await service.getDamageReturns('A');
      expect(prisma.devolucion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sucursal: { empresaId: 'A' },
          }),
        }),
      );
    });

    it('invoiceDamageReturn: sin empresaId falla cerrado sin abrir transaccion ni consultar; con empresaId filtra por empresa', async () => {
      const service = new BillingService(prisma);
      await expect(service.invoiceDamageReturn('dev-1', undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.invoiceDamageReturn('dev-1', '' as any)).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(prisma.devolucion.findFirst).not.toHaveBeenCalled();

      await expect(service.invoiceDamageReturn('dev-1', 'A')).rejects.toThrow(NotFoundException);
      expect(prisma.devolucion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1', sucursal: { empresaId: 'A' } },
        }),
      );
    });
    it('getPendingQuotations filtra por empresa', async () => {
      const service = new BillingService(prisma);
      await service.getPendingQuotations('A');
      expect(prisma.cotizacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ empresaId: 'A' }, { cliente: { empresaId: 'A' } }],
          }),
        }),
      );
    });
  });

  describe('QuotationsService: filtros por empresa que no se omiten', () => {
    const fuente = readFileSync(join(__dirname, 'quotations/services/quotations.service.ts'), 'utf8');

    /**
     * acceptPublic (flujo publico por token): pruebas de comportamiento. Todas las
     * consultas que dependen de la empresa de la cotizacion llevan ese empresaId, y
     * una cotizacion sin empresa no genera contrato.
     */
    describe('acceptPublic (comportamiento)', () => {
      const cotizacionBase = (extra: Record<string, unknown> = {}) => ({
        id: 'cot-a', empresaId: 'A', sucursalId: null, clienteId: 'cli-1',
        numeroCotizacion: 'COT-0001', version: 1, tokenPublico: 'tok',
        tokenPublicoRevocado: false, estado: EstadoCotizacion.ENVIADA,
        fechaVence: new Date(Date.now() + 86400000),
        items: [{ id: 'it-1', equipoId: 'eq-a', descripcion: 'Equipo', cantidad: 1, dias: 3, precioUnitario: 100, tipoCobro: 'POR_DIA' }],
        ...extra,
      });
      const equipos = [
        { id: 'eq-a', empresaId: 'A', tipoControl: 'SERIALIZADO', horometro: 0, cantidadDisponible: 1, estado: 'DISPONIBLE', modelo: 'M' },
        { id: 'eq-b', empresaId: 'B', tipoControl: 'SERIALIZADO', horometro: 0, cantidadDisponible: 1, estado: 'DISPONIBLE', modelo: 'M' },
      ];
      function armar(cot: any) {
        const tx: any = {
          $executeRaw: jest.fn(),
          cotizacion: { findUnique: jest.fn().mockResolvedValue(cot), update: jest.fn() },
          contrato: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'ctr-1', codigo: 'CTR-1', estado: 'SIN_ABRIR', items: [] }),
            count: jest.fn().mockResolvedValue(0),
          },
          sucursal: { findFirst: jest.fn().mockResolvedValue({ id: 'suc-a' }) },
          equipo: {
            findMany: jest.fn(async ({ where }: any) =>
              equipos.filter((e) => where.id.in.includes(e.id) && e.empresaId === where.empresaId)),
            update: jest.fn(),
          },
          reserva: { create: jest.fn() },
          auditoria: { create: jest.fn() },
          secuenciaNumeracion: { upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }) },
        };
        const p: any = { $transaction: jest.fn(async (cb: any) => cb(tx)) };
        return { tx, service: new QuotationsService(p) };
      }

      it('una cotizacion sin empresa no genera contrato ni consulta equipos', async () => {
        const { tx, service } = armar(cotizacionBase({ empresaId: null }));
        await expect(service.acceptPublic('tok')).rejects.toThrow(BadRequestException);
        expect(tx.contrato.create).not.toHaveBeenCalled();
        expect(tx.equipo.findMany).not.toHaveBeenCalled();
        expect(tx.sucursal.findFirst).not.toHaveBeenCalled();
      });

      it('sucursal por defecto, equipos y auditoria se acotan a la empresa de la cotizacion', async () => {
        const { tx, service } = armar(cotizacionBase());
        const res = await service.acceptPublic('tok');
        expect(res.success).toBe(true);
        expect(tx.sucursal.findFirst).toHaveBeenCalledWith({ where: { empresaId: 'A' } });
        expect(tx.equipo.findMany).toHaveBeenCalled();
        for (const [arg] of tx.equipo.findMany.mock.calls) {
          expect(arg.where.empresaId).toBe('A');
        }
        expect(tx.auditoria.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ empresaId: 'A', accion: 'COTIZACION_ACEPTADA' }) }),
        );
      });

      it('un equipo de otra empresa no se puede contratar desde la cotizacion de A', async () => {
        const { tx, service } = armar(
          cotizacionBase({ items: [{ id: 'it-1', equipoId: 'eq-b', descripcion: 'Equipo B', cantidad: 1, dias: 3, precioUnitario: 100, tipoCobro: 'POR_DIA' }] }),
        );
        await expect(service.acceptPublic('tok')).rejects.toThrow(BadRequestException);
        expect(tx.contrato.create).not.toHaveBeenCalled();
        expect(tx.reserva.create).not.toHaveBeenCalled();
      });
    });

    // El bloque ACEPTADA de update() es INALCANZABLE: update() lanza 400 ante
    // estado ACEPTADA/CONVERTIDA_A_CONTRATO antes de llegar alli, y el controlador
    // tambien. No se puede ejercitar por comportamiento, asi que se conserva esta
    // verificacion estatica del codigo fuente (hasta que el bloque se elimine en la
    // limpieza). El resto de filtros por empresa se prueban arriba por comportamiento.
    it('ningun filtro por empresa depende de `empId ? ... : undefined` (falla cerrado con assertEmpresaId) [bloque inalcanzable de update(): verificacion estatica]', () => {
      expect(fuente).not.toMatch(/empId\s*\?\s*\{\s*(where:\s*)?\{?\s*empresaId/);
      expect(fuente).not.toMatch(/\.\.\.\(empId\s*\?/);
      expect(fuente).not.toMatch(/empId\s*&&\s*\n?\s*sucursalId/);
      expect(fuente).toMatch(/const empId = assertEmpresaId\(\s*cotizacion\.empresaId \|\| empresaId \|\| existing\.empresaId,\s*\)/);
    });
  });

  describe('RolesService.findOne', () => {
    it('rol personalizado de B es inaccesible para A; rol de sistema (null) es visible', async () => {
      const service = new RolesService(prisma);
      prisma.rol.findUnique.mockResolvedValue({ id: 'rol-b', empresaId: 'B', permisos: [] });
      await expect(service.findOne('rol-b', 'A')).rejects.toThrow(NotFoundException);

      prisma.rol.findUnique.mockResolvedValue({ id: 'rol-sis', nombre: 'ADMIN', empresaId: null, permisos: [], usuarios: [] });
      await expect(service.findOne('rol-sis', 'A')).resolves.toBeDefined();
    });

    it('rechaza empresaId ausente antes de consultar', async () => {
      const service = new RolesService(prisma);
      await expect(service.findOne('rol-b', undefined as any)).rejects.toThrow(ForbiddenException);
      expect(prisma.rol.findUnique).not.toHaveBeenCalled();
    });
  });
});