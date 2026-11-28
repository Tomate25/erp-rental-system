export const ERP_MODULE_IDS = [
  'clients',
  'inventory',
  'providers',
  'purchases',
  'insumos',
  'promociones',
  'availability',
  'quotations',
  'contracts',
  'operations',
  'billing',
  'cxc',
  'accounting',
  'maintenance',
  'audit',
  'security',
  'commissions',
  'sales',
  'payroll',
  'numbering',
  'reports',
] as const;

export type ErpModuleId = (typeof ERP_MODULE_IDS)[number];

export type StoredModuleAccessLevel = 'LECTURA' | 'ESCRITURA';
export type ModuleAccessLevel = 'SIN_ACCESO' | StoredModuleAccessLevel;

export type UserModulePermissionsMap = Partial<
  Record<ErpModuleId, StoredModuleAccessLevel>
>;

export type ErpModuleArea =
  | 'Comercial'
  | 'Inventario y Compras'
  | 'Operaciones y Taller'
  | 'Finanzas y Contabilidad'
  | 'Administración y RRHH'
  | 'Seguridad y Control';

export const ERP_MODULE_AREAS: readonly ErpModuleArea[] = [
  'Comercial',
  'Inventario y Compras',
  'Operaciones y Taller',
  'Finanzas y Contabilidad',
  'Administración y RRHH',
  'Seguridad y Control',
] as const;

export interface ErpModuleCatalogItem {
  id: ErpModuleId;
  nombre: string;
  descripcion: string;
  area: ErpModuleArea;
  defaultRoles: string[];
}

export const ERP_MODULES_CATALOG: readonly ErpModuleCatalogItem[] = [
  {
    id: 'clients',
    nombre: 'Clientes',
    descripcion: 'Directorio de empresas, contactos y registro de arrendatarios',
    area: 'Comercial',
    defaultRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR', 'FACTURACION', 'OPERACIONES', 'CONTABILIDAD'],
  },
  {
    id: 'quotations',
    nombre: 'Cotizaciones',
    descripcion: 'Presupuestos de renta comercial y autorizaciones de precio',
    area: 'Comercial',
    defaultRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR'],
  },
  {
    id: 'contracts',
    nombre: 'Contratos',
    descripcion: 'Formalización de contrato de arrendamiento y plan de cortes',
    area: 'Comercial',
    defaultRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR', 'FACTURACION', 'OPERACIONES'],
  },
  {
    id: 'promociones',
    nombre: 'Promociones y Combos',
    descripcion: 'Paquetes de maquinaria y tarifas promocionales para ofrecer en cotizaciones',
    area: 'Comercial',
    defaultRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION'],
  },
  {
    id: 'inventory',
    nombre: 'Inventario y Maquinaria',
    descripcion: 'Control de maquinaria pesada, tarifas por hora/día, series y horómetros',
    area: 'Inventario y Compras',
    defaultRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR', 'OPERACIONES', 'MANTENIMIENTO', 'BODEGA', 'LOGISTICA', 'SUPERVISOR', 'AUDITOR', 'FACTURACION', 'CONTABILIDAD'],
  },
  {
    id: 'providers',
    nombre: 'Proveedores',
    descripcion: 'Catálogo de proveedores de maquinaria externa, insumos y talleres',
    area: 'Inventario y Compras',
    defaultRoles: ['ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO', 'OPERACIONES', 'COMERCIAL', 'CONTABILIDAD'],
  },
  {
    id: 'purchases',
    nombre: 'Compras y Maquinaria Externa',
    descripcion: 'Órdenes de compra de insumos para bodega y períodos de renta de maquinaria externa',
    area: 'Inventario y Compras',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'OPERACIONES', 'MANTENIMIENTO', 'BODEGA', 'INVENTARIO', 'COMERCIAL'],
  },
  {
    id: 'insumos',
    nombre: 'Bodega de Insumos',
    descripcion: 'Existencias de lubricantes, filtros, consumibles y repuestos de taller',
    area: 'Inventario y Compras',
    defaultRoles: ['ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO', 'OPERACIONES', 'BODEGA', 'CONTABILIDAD'],
  },
  {
    id: 'availability',
    nombre: 'Disponibilidad y Reservas',
    descripcion: 'Calendario de ocupación y reservas de equipos en tiempo real',
    area: 'Operaciones y Taller',
    defaultRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR', 'OPERACIONES', 'MANTENIMIENTO', 'BODEGA', 'LOGISTICA', 'SUPERVISOR'],
  },
  {
    id: 'operations',
    nombre: 'Operaciones (Despacho / Retorno)',
    descripcion: 'Despacho de equipos, inspección de salida, retornos y lecturas de horómetros',
    area: 'Operaciones y Taller',
    defaultRoles: ['ADMIN', 'GERENTE', 'OPERACIONES', 'MANTENIMIENTO', 'LOGISTICA', 'BODEGA', 'SUPERVISOR'],
  },
  {
    id: 'maintenance',
    nombre: 'Taller y Mantenimiento',
    descripcion: 'Servicios preventivos, correctivos y registro de averías/repuestos',
    area: 'Operaciones y Taller',
    defaultRoles: ['ADMIN', 'GERENTE', 'MANTENIMIENTO', 'OPERACIONES', 'BODEGA'],
  },
  {
    id: 'billing',
    nombre: 'Facturación y Caja',
    descripcion: 'Emisión de facturas por cortes de contrato o cotizaciones y cobros',
    area: 'Finanzas y Contabilidad',
    defaultRoles: ['ADMIN', 'GERENTE', 'FACTURACION', 'CONTABILIDAD'],
  },
  {
    id: 'cxc',
    nombre: 'Cuentas por Cobrar (CxC)',
    descripcion: 'Gestión de cartera, antigüedad de saldos, estado de cuenta, recibos y acuerdos de pago',
    area: 'Finanzas y Contabilidad',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION', 'COMERCIAL', 'VENDEDOR'],
  },
  {
    id: 'accounting',
    nombre: 'Contabilidad & Finanzas',
    descripcion: 'Balance General, Estado de Resultados, Libro Diario, Bancos, CxC y CxP',
    area: 'Finanzas y Contabilidad',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD'],
  },
  {
    id: 'commissions',
    nombre: 'Comisiones de Ventas',
    descripcion: 'Configuración de escalas de comisión comercial y simulador de liquidación',
    area: 'Administración y RRHH',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'RRHH'],
  },
  {
    id: 'sales',
    nombre: 'Supervisión y Ranking de Ventas',
    descripcion: 'Ranking de asesores comerciales, cotizaciones consolidadas y métricas de efectividad',
    area: 'Administración y RRHH',
    defaultRoles: ['ADMIN', 'GERENTE'],
  },
  {
    id: 'payroll',
    nombre: 'Nómina & Recursos Humanos',
    descripcion: 'Planilla quincenal de Nicaragua, cotizaciones INSS, retenciones IR, horas extra y colillas',
    area: 'Administración y RRHH',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'RRHH'],
  },
  {
    id: 'numbering',
    nombre: 'Series y Folios (Numeración)',
    descripcion: 'Configuración oficial de correlativos, rangos, series fiscales y folios de documentos',
    area: 'Administración y RRHH',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD'],
  },
  {
    id: 'audit',
    nombre: 'Bitácora de Auditoría',
    descripcion: 'Trazabilidad de actividades, cambios de datos e inicios de sesión',
    area: 'Seguridad y Control',
    defaultRoles: ['ADMIN', 'GERENTE', 'AUDITOR', 'CONTABILIDAD'],
  },
  {
    id: 'security',
    nombre: 'Seguridad y Roles',
    descripcion: 'Gestión de usuarios, permisos por módulo y credenciales de acceso',
    area: 'Seguridad y Control',
    defaultRoles: ['ADMIN'],
  },
  {
    id: 'reports',
    nombre: 'Centro de Reportes y Anulaciones',
    descripcion:
      'Informes ejecutivos de todos los módulos con exportación Excel dinámica y anulación de documentos con impacto en inventario y contabilidad',
    area: 'Finanzas y Contabilidad',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'CONTABILIDAD',
      'AUDITOR',
      'FACTURACION',
      'OPERACIONES',
      'COMERCIAL',
      'RRHH',
    ],
  },
] as const;

const MODULE_BY_ID = new Map<string, ErpModuleCatalogItem>(
  ERP_MODULES_CATALOG.map((m) => [m.id, m]),
);

export function normalizeUserRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  const normalized = roles.map((r: any) => {
    if (typeof r === 'string') return r.toUpperCase();
    if (r?.nombre) return String(r.nombre).toUpperCase();
    if (r?.rol?.nombre) return String(r.rol.nombre).toUpperCase();
    return String(r).toUpperCase();
  });
  if (normalized.includes('VENDEDOR') && !normalized.includes('COMERCIAL')) {
    normalized.push('COMERCIAL');
  }
  if (normalized.includes('COMERCIAL') && !normalized.includes('VENDEDOR')) {
    normalized.push('VENDEDOR');
  }
  return Array.from(new Set(normalized));
}

export function getDefaultModulePermissionsForRoles(
  roleNames: string[],
): UserModulePermissionsMap {
  const normalized = normalizeUserRoles(roleNames);
  const isAdmin = normalized.includes('ADMIN');
  const map: UserModulePermissionsMap = {};

  for (const mod of ERP_MODULES_CATALOG) {
    if (isAdmin || mod.defaultRoles.some((r) => normalized.includes(r))) {
      map[mod.id] = 'ESCRITURA';
    }
  }
  return map;
}

export interface UserAccessSubject {
  roles?: unknown;
  permisosModulosPersonalizados?: boolean;
  permisosModulos?: UserModulePermissionsMap | null;
}

export function resolveUserModuleAccess(
  user: UserAccessSubject | null | undefined,
  moduleId: string,
): ModuleAccessLevel {
  if (!user) return 'SIN_ACCESO';

  const normalizedRoles = normalizeUserRoles(user.roles);
  if (normalizedRoles.includes('ADMIN')) {
    return 'ESCRITURA';
  }

  if (user.permisosModulosPersonalizados) {
    const level = user.permisosModulos?.[moduleId as ErpModuleId];
    if (level === 'LECTURA' || level === 'ESCRITURA') {
      return level;
    }
    return 'SIN_ACCESO';
  }

  const def = MODULE_BY_ID.get(moduleId);
  if (def && def.defaultRoles.some((r) => normalizedRoles.includes(r))) {
    return 'ESCRITURA';
  }

  return 'SIN_ACCESO';
}

export function summarizeModulePermissions(perms: UserModulePermissionsMap): {
  total: number;
  lectura: number;
  escritura: number;
} {
  let lectura = 0;
  let escritura = 0;
  for (const id of ERP_MODULE_IDS) {
    const level = perms[id];
    if (level === 'LECTURA') lectura += 1;
    else if (level === 'ESCRITURA') escritura += 1;
  }
  return { total: lectura + escritura, lectura, escritura };
}

export function mapToModulePermissionItems(
  perms: UserModulePermissionsMap,
): Array<{ modulo: ErpModuleId; nivel: StoredModuleAccessLevel }> {
  const items: Array<{ modulo: ErpModuleId; nivel: StoredModuleAccessLevel }> = [];
  for (const id of ERP_MODULE_IDS) {
    const nivel = perms[id];
    if (nivel === 'LECTURA' || nivel === 'ESCRITURA') {
      items.push({ modulo: id, nivel });
    }
  }
  return items;
}
