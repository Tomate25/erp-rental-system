import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing/billing.service';
import { ContractsService } from './contracts/services/contracts.service';
import { UsersService } from './users/services/users.service';

/**
 * Los bloqueos de fila (SELECT ... FOR UPDATE) deben ejecutarse SIEMPRE dentro
 * de la transaccion. Antes iban envueltos en `if (tx.$executeRaw)`, de modo que
 * un cliente de transaccion sin ese metodo omitia el bloqueo en silencio.
 */
const sqlDe = (llamada: unknown[]): string => (llamada[0] as string[]).join('?');

function archivosTs(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivosTs(ruta);
    return ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts') ? [ruta] : [];
  });
}

describe('Bloqueos de fila incondicionales (FOR UPDATE)', () => {
  it('ningun servicio condiciona el bloqueo con `if (tx.$executeRaw)`', () => {
    const condicionales = archivosTs(join(__dirname, '..'))
      .filter((ruta) => /if\s*\(\s*tx\.\$executeRaw\b/.test(readFileSync(ruta, 'utf8')))
      .map((ruta) => ruta.replace(join(__dirname, '..'), ''));
    expect(condicionales).toEqual([]);
  });

  describe('bloquean aunque el recurso no exista y fallan si la transaccion no soporta bloqueos', () => {
    const crearPrisma = (conBloqueo: boolean) => {
      const tx: any = {
        usuario: { findFirst: jest.fn(async () => null) },
        devolucion: { findFirst: jest.fn(async () => null) },
        contrato: { findFirst: jest.fn(async () => null) },
      };
      if (conBloqueo) tx.$executeRaw = jest.fn();
      return { tx, prisma: { $transaction: jest.fn(async (cb: any) => cb(tx)) } as any };
    };

    it('UsersService.toggleStatus bloquea la empresa', async () => {
      const { tx, prisma } = crearPrisma(true);
      await expect(new UsersService(prisma).toggleStatus('u2', 'u1', 'emp-a')).rejects.toThrow(NotFoundException);
      expect(sqlDe(tx.$executeRaw.mock.calls[0])).toContain('"empresas"');
      expect(sqlDe(tx.$executeRaw.mock.calls[0])).toContain('FOR UPDATE');
    });

    it('UsersService.updateRoles bloquea la empresa', async () => {
      const { tx, prisma } = crearPrisma(true);
      await expect(
        new UsersService(prisma).updateRoles('u2', { rolIds: [] } as any, 'emp-a', 'u1'),
      ).rejects.toThrow(NotFoundException);
      expect(sqlDe(tx.$executeRaw.mock.calls[0])).toContain('"empresas"');
    });

    it('BillingService.invoiceDamageReturn bloquea la devolucion', async () => {
      const { tx, prisma } = crearPrisma(true);
      await expect(new BillingService(prisma).invoiceDamageReturn('dev-1', 'emp-a')).rejects.toThrow(NotFoundException);
      expect(sqlDe(tx.$executeRaw.mock.calls[0])).toContain('"devoluciones"');
    });

    it('ContractsService.finalizeContract bloquea el contrato acotado a la empresa', async () => {
      const { tx, prisma } = crearPrisma(true);
      await expect(new ContractsService(prisma).finalizeContract('ctr-1', 'emp-a')).rejects.toThrow(NotFoundException);
      expect(sqlDe(tx.$executeRaw.mock.calls[0])).toContain('"contratos"');
      expect(tx.$executeRaw.mock.calls[0][2]).toBe('emp-a');
    });

    it.each([
      ['UsersService.toggleStatus', (p: any) => new UsersService(p).toggleStatus('u2', 'u1', 'emp-a')],
      ['BillingService.invoiceDamageReturn', (p: any) => new BillingService(p).invoiceDamageReturn('dev-1', 'emp-a')],
      ['ContractsService.finalizeContract', (p: any) => new ContractsService(p).finalizeContract('ctr-1', 'emp-a')],
    ])('%s no omite el bloqueo si tx.$executeRaw no existe (lanza en vez de seguir sin lock)', async (_n, llamar) => {
      const { tx, prisma } = crearPrisma(false);
      await expect(llamar(prisma)).rejects.toThrow(TypeError);
      expect(tx.usuario.findFirst).not.toHaveBeenCalled();
      expect(tx.devolucion.findFirst).not.toHaveBeenCalled();
      expect(tx.contrato.findFirst).not.toHaveBeenCalled();
    });
  });
});