import { describe, expect, it } from 'vitest';
import {
  ERP_MODULES_CATALOG,
  getDefaultModulePermissionsForRoles,
  mapToModulePermissionItems,
  resolveUserModuleAccess,
  summarizeModulePermissions,
} from './modules';

describe('Permisos granulares por módulo (21 módulos ERP)', () => {
  it('contiene exactamente los 21 módulos del sistema ERP sin duplicados', () => {
    const ids = ERP_MODULES_CATALOG.map((m) => m.id);
    expect(ids).toHaveLength(21);
    expect(new Set(ids).size).toBe(21);
    expect(ids).toContain('reports');
  });

  it('respeta permisos personalizados: solo 2 módulos (1 solo ver, 1 escribir) y bloquea los otros 18', () => {
    const user = {
      roles: ['GERENTE'],
      permisosModulosPersonalizados: true,
      permisosModulos: {
        clients: 'LECTURA' as const,
        quotations: 'ESCRITURA' as const,
      },
    };

    expect(resolveUserModuleAccess(user, 'clients')).toBe('LECTURA');
    expect(resolveUserModuleAccess(user, 'quotations')).toBe('ESCRITURA');
    expect(resolveUserModuleAccess(user, 'inventory')).toBe('SIN_ACCESO');
    expect(resolveUserModuleAccess(user, 'billing')).toBe('SIN_ACCESO');
    expect(resolveUserModuleAccess(user, 'accounting')).toBe('SIN_ACCESO');
    expect(resolveUserModuleAccess(user, 'payroll')).toBe('SIN_ACCESO');
  });

  it('otorga acceso total de ESCRITURA a ADMIN en todos los módulos', () => {
    const admin = {
      roles: ['ADMIN'],
      permisosModulosPersonalizados: true,
      permisosModulos: {},
    };

    for (const mod of ERP_MODULES_CATALOG) {
      expect(resolveUserModuleAccess(admin, mod.id)).toBe('ESCRITURA');
    }
  });

  it('usa los módulos predeterminados del rol cuando no está personalizado', () => {
    const user = {
      roles: ['CONTABILIDAD'],
      permisosModulosPersonalizados: false,
      permisosModulos: {},
    };

    expect(resolveUserModuleAccess(user, 'accounting')).toBe('ESCRITURA');
    expect(resolveUserModuleAccess(user, 'billing')).toBe('ESCRITURA');
    expect(resolveUserModuleAccess(user, 'security')).toBe('SIN_ACCESO');
    expect(resolveUserModuleAccess(user, 'operations')).toBe('SIN_ACCESO');
  });

  it('resume y serializa correctamente el mapa de permisos para la API', () => {
    const perms = {
      clients: 'LECTURA' as const,
      inventory: 'LECTURA' as const,
      quotations: 'ESCRITURA' as const,
    };

    expect(summarizeModulePermissions(perms)).toEqual({
      total: 3,
      lectura: 2,
      escritura: 1,
    });

    expect(mapToModulePermissionItems(perms)).toEqual([
      { modulo: 'clients', nivel: 'LECTURA' },
      { modulo: 'inventory', nivel: 'LECTURA' },
      { modulo: 'quotations', nivel: 'ESCRITURA' },
    ]);

    const defaults = getDefaultModulePermissionsForRoles(['VENDEDOR']);
    expect(defaults.quotations).toBe('ESCRITURA');
    expect(defaults.security).toBeUndefined();
  });
});
