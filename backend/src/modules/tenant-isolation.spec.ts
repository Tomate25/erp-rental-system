import { readFileSync } from 'fs';
import { join } from 'path';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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

    it('ningun filtro por empresa depende de `empId ? ... : undefined` (falla cerrado con assertEmpresaId)', () => {
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