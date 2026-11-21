import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard (Roles + Permisos Granulares por Módulo)', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const buildContext = (opts: {
    requiredRoles?: string[];
    user?: Record<string, unknown>;
    method?: string;
    originalUrl?: string;
  }): ExecutionContext => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(opts.requiredRoles ?? ['ADMIN', 'COMERCIAL']);

    const req = {
      user: opts.user,
      method: opts.method ?? 'GET',
      originalUrl: opts.originalUrl ?? '/api/v1/clients',
    };

    return {
      getHandler: () => (() => undefined) as unknown,
      getClass: () => class DummyController {} as unknown,
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('permite acceso irrestricto al rol ADMIN incluso en escrituras', () => {
    const ctx = buildContext({
      requiredRoles: ['GERENTE'],
      user: {
        roles: ['ADMIN'],
        permisosModulosPersonalizados: true,
        permisosModulos: {},
      },
      method: 'DELETE',
      originalUrl: '/api/v1/clients/123',
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('mantiene comportamiento heredado por roles cuando permisosModulosPersonalizados es false', () => {
    const ctxAllowed = buildContext({
      requiredRoles: ['ADMIN', 'COMERCIAL'],
      user: {
        roles: ['VENDEDOR'],
        permisosModulosPersonalizados: false,
        permisosModulos: {},
      },
      method: 'POST',
      originalUrl: '/api/v1/quotations',
    });
    expect(guard.canActivate(ctxAllowed)).toBe(true);

    const ctxDenied = buildContext({
      requiredRoles: ['ADMIN', 'CONTABILIDAD'],
      user: {
        roles: ['OPERACIONES'],
        permisosModulosPersonalizados: false,
        permisosModulos: {},
      },
      method: 'GET',
      originalUrl: '/api/v1/accounting/balance-general',
    });
    expect(() => guard.canActivate(ctxDenied)).toThrow(ForbiddenException);
  });

  it('permite solo ver (GET) en módulo con nivel LECTURA y bloquea escrituras (POST/PATCH/DELETE)', () => {
    const user = {
      roles: ['OPERACIONES'],
      permisosModulosPersonalizados: true,
      permisosModulos: {
        clients: 'LECTURA',
        quotations: 'ESCRITURA',
      },
    };

    expect(
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'COMERCIAL'],
          user,
          method: 'GET',
          originalUrl: '/api/v1/clients',
        }),
      ),
    ).toBe(true);

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(() =>
        guard.canActivate(
          buildContext({
            requiredRoles: ['ADMIN', 'COMERCIAL'],
            user,
            method,
            originalUrl: '/api/v1/clients/123',
          }),
        ),
      ).toThrow(
        new ForbiddenException(
          'Tu cuenta tiene acceso de solo lectura en este módulo. No puedes crear, editar ni eliminar registros.',
        ),
      );
    }
  });

  it('permite lectura y escritura en módulo con nivel ESCRITURA', () => {
    const user = {
      roles: ['OPERACIONES'],
      permisosModulosPersonalizados: true,
      permisosModulos: {
        clients: 'LECTURA',
        quotations: 'ESCRITURA',
      },
    };

    expect(
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'COMERCIAL'],
          user,
          method: 'POST',
          originalUrl: '/api/v1/quotations',
        }),
      ),
    ).toBe(true);

    expect(
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'COMERCIAL'],
          user,
          method: 'PATCH',
          originalUrl: '/api/v1/quotations/abc',
        }),
      ),
    ).toBe(true);
  });

  it('bloquea módulos no asignados tanto en lectura como en escritura', () => {
    const user = {
      roles: ['GERENTE'], // Aunque su rol heredado tendría acceso, el modo personalizado manda
      permisosModulosPersonalizados: true,
      permisosModulos: {
        clients: 'LECTURA',
        quotations: 'ESCRITURA',
      },
    };

    expect(() =>
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'GERENTE'],
          user,
          method: 'GET',
          originalUrl: '/api/v1/payroll/planillas',
        }),
      ),
    ).toThrow(ForbiddenException);

    expect(() =>
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'GERENTE'],
          user,
          method: 'POST',
          originalUrl: '/api/v1/billing/invoices',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('permite consultas auxiliares GET necesarias para operar un módulo autorizado, sin permitir escritura ni estados financieros', () => {
    const userBilling = {
      roles: ['FACTURACION'],
      permisosModulosPersonalizados: true,
      permisosModulos: {
        billing: 'ESCRITURA',
      },
    };

    // Necesita consultar bancos para el selector de cuenta destino
    expect(
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'CONTABILIDAD', 'FACTURACION'],
          user: userBilling,
          method: 'GET',
          originalUrl: '/api/v1/accounting/bancos',
        }),
      ),
    ).toBe(true);

    // NO puede ver Balance General ni crear asientos contables
    expect(() =>
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'CONTABILIDAD', 'FACTURACION'],
          user: userBilling,
          method: 'GET',
          originalUrl: '/api/v1/accounting/balance-general',
        }),
      ),
    ).toThrow(ForbiddenException);

    expect(() =>
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'CONTABILIDAD'],
          user: userBilling,
          method: 'POST',
          originalUrl: '/api/v1/accounting/asientos',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('distingue rutas de Supervisión de Ventas (/quotations/sales-ranking) del módulo Cotizaciones', () => {
    const userOnlyQuotations = {
      roles: ['GERENTE'],
      permisosModulosPersonalizados: true,
      permisosModulos: {
        quotations: 'ESCRITURA',
      },
    };

    expect(() =>
      guard.canActivate(
        buildContext({
          requiredRoles: ['ADMIN', 'GERENTE'],
          user: userOnlyQuotations,
          method: 'GET',
          originalUrl: '/api/v1/quotations/sales-ranking',
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
