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
] as const;

export type ErpModuleId = (typeof ERP_MODULE_IDS)[number];

export type ModuleAccessLevel = 'LECTURA' | 'ESCRITURA';

export type UserModulePermissionsMap = Partial<
  Record<ErpModuleId, ModuleAccessLevel>
>;

export interface ErpModuleDefinition {
  id: ErpModuleId;
  nombre: string;
  descripcion: string;
  area:
    | 'Comercial'
    | 'Inventario y Compras'
    | 'Operaciones y Taller'
    | 'Finanzas y Contabilidad'
    | 'Administración y RRHH'
    | 'Seguridad y Control';
  defaultRoles: string[];
}

export const ERP_MODULES_CATALOG: readonly ErpModuleDefinition[] = [
  {
    id: 'clients',
    nombre: 'Clientes',
    descripcion:
      'Directorio de empresas, contactos y registro de arrendatarios',
    area: 'Comercial',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'COMERCIAL',
      'VENDEDOR',
      'FACTURACION',
      'OPERACIONES',
      'CONTABILIDAD',
    ],
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
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'COMERCIAL',
      'VENDEDOR',
      'FACTURACION',
      'OPERACIONES',
    ],
  },
  {
    id: 'promociones',
    nombre: 'Promociones y Combos',
    descripcion:
      'Paquetes de maquinaria y tarifas promocionales para cotizaciones',
    area: 'Comercial',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'COMERCIAL',
      'OPERACIONES',
      'FACTURACION',
    ],
  },
  {
    id: 'inventory',
    nombre: 'Inventario y Maquinaria',
    descripcion:
      'Control de maquinaria pesada, tarifas por hora/día, series y horómetros',
    area: 'Inventario y Compras',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'COMERCIAL',
      'VENDEDOR',
      'OPERACIONES',
      'MANTENIMIENTO',
      'BODEGA',
      'LOGISTICA',
      'SUPERVISOR',
      'AUDITOR',
      'FACTURACION',
      'CONTABILIDAD',
    ],
  },
  {
    id: 'providers',
    nombre: 'Proveedores',
    descripcion:
      'Catálogo de proveedores de maquinaria externa, insumos y talleres',
    area: 'Inventario y Compras',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'INVENTARIO',
      'MANTENIMIENTO',
      'OPERACIONES',
      'COMERCIAL',
      'CONTABILIDAD',
    ],
  },
  {
    id: 'purchases',
    nombre: 'Compras y Maquinaria Externa',
    descripcion:
      'Órdenes de compra de insumos y períodos de renta de maquinaria externa',
    area: 'Inventario y Compras',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'CONTABILIDAD',
      'OPERACIONES',
      'MANTENIMIENTO',
      'BODEGA',
      'INVENTARIO',
      'COMERCIAL',
    ],
  },
  {
    id: 'insumos',
    nombre: 'Bodega de Insumos',
    descripcion:
      'Existencias de lubricantes, filtros, consumibles y repuestos de taller',
    area: 'Inventario y Compras',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'INVENTARIO',
      'MANTENIMIENTO',
      'OPERACIONES',
      'BODEGA',
      'CONTABILIDAD',
    ],
  },
  {
    id: 'availability',
    nombre: 'Disponibilidad y Reservas',
    descripcion: 'Calendario de ocupación y reservas de equipos en tiempo real',
    area: 'Operaciones y Taller',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'COMERCIAL',
      'VENDEDOR',
      'OPERACIONES',
      'MANTENIMIENTO',
      'BODEGA',
      'LOGISTICA',
      'SUPERVISOR',
    ],
  },
  {
    id: 'operations',
    nombre: 'Operaciones (Despacho / Retorno)',
    descripcion:
      'Despacho de equipos, inspección de salida, retornos y horómetros',
    area: 'Operaciones y Taller',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'OPERACIONES',
      'MANTENIMIENTO',
      'LOGISTICA',
      'BODEGA',
      'SUPERVISOR',
    ],
  },
  {
    id: 'maintenance',
    nombre: 'Taller y Mantenimiento',
    descripcion:
      'Servicios preventivos, correctivos y registro de averías/repuestos',
    area: 'Operaciones y Taller',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'MANTENIMIENTO',
      'OPERACIONES',
      'BODEGA',
    ],
  },
  {
    id: 'billing',
    nombre: 'Facturación y Caja',
    descripcion:
      'Emisión de facturas por cortes de contrato o cotizaciones y cobros',
    area: 'Finanzas y Contabilidad',
    defaultRoles: ['ADMIN', 'GERENTE', 'FACTURACION', 'CONTABILIDAD'],
  },
  {
    id: 'cxc',
    nombre: 'Cuentas por Cobrar (CxC)',
    descripcion:
      'Cartera, antigüedad de saldos, estado de cuenta, recibos y acuerdos de pago',
    area: 'Finanzas y Contabilidad',
    defaultRoles: [
      'ADMIN',
      'GERENTE',
      'CONTABILIDAD',
      'FACTURACION',
      'COMERCIAL',
      'VENDEDOR',
    ],
  },
  {
    id: 'accounting',
    nombre: 'Contabilidad & Finanzas',
    descripcion:
      'Balance General, Estado de Resultados, Libro Diario, Bancos, CxC y CxP',
    area: 'Finanzas y Contabilidad',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD'],
  },
  {
    id: 'commissions',
    nombre: 'Comisiones de Ventas',
    descripcion:
      'Configuración de escalas de comisión comercial y simulador de liquidación',
    area: 'Administración y RRHH',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'RRHH'],
  },
  {
    id: 'sales',
    nombre: 'Supervisión y Ranking de Ventas',
    descripcion:
      'Ranking de asesores comerciales, cotizaciones consolidadas y métricas',
    area: 'Administración y RRHH',
    defaultRoles: ['ADMIN', 'GERENTE'],
  },
  {
    id: 'payroll',
    nombre: 'Nómina & Recursos Humanos',
    descripcion:
      'Planilla quincenal de Nicaragua, INSS, retenciones IR, horas extra y colillas',
    area: 'Administración y RRHH',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'RRHH'],
  },
  {
    id: 'numbering',
    nombre: 'Series y Folios (Numeración)',
    descripcion:
      'Configuración oficial de correlativos, rangos, series fiscales y folios',
    area: 'Administración y RRHH',
    defaultRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD'],
  },
  {
    id: 'audit',
    nombre: 'Bitácora de Auditoría',
    descripcion:
      'Trazabilidad de actividades, cambios de datos e inicios de sesión',
    area: 'Seguridad y Control',
    defaultRoles: ['ADMIN', 'GERENTE', 'AUDITOR', 'CONTABILIDAD'],
  },
  {
    id: 'security',
    nombre: 'Seguridad y Roles',
    descripcion: 'Gestión de usuarios, permisos por módulo y credenciales',
    area: 'Seguridad y Control',
    defaultRoles: ['ADMIN'],
  },
] as const;

const VALID_MODULE_ID_SET = new Set<string>(ERP_MODULE_IDS);

export function isValidErpModuleId(value: string): value is ErpModuleId {
  return VALID_MODULE_ID_SET.has(value);
}

/**
 * Normaliza filas de Prisma (`UsuarioPermisoModulo[]`) o un mapa plano a
 * `UserModulePermissionsMap` seguro con módulos y niveles válidos.
 */
export function normalizeUserModulePermissions(
  input?:
    Array<{ modulo: string; nivel: string }> | Record<string, string> | null,
): UserModulePermissionsMap {
  const result: UserModulePermissionsMap = {};
  if (!input) {
    return result;
  }

  if (Array.isArray(input)) {
    for (const row of input) {
      if (!row || !isValidErpModuleId(row.modulo)) continue;
      const nivel = String(row.nivel || '').toUpperCase();
      if (nivel === 'LECTURA' || nivel === 'ESCRITURA') {
        result[row.modulo] = nivel;
      }
    }
    return result;
  }

  for (const [modulo, rawNivel] of Object.entries(input)) {
    if (!isValidErpModuleId(modulo)) continue;
    const nivel = String(rawNivel || '').toUpperCase();
    if (nivel === 'LECTURA' || nivel === 'ESCRITURA') {
      result[modulo] = nivel;
    }
  }

  return result;
}

/**
 * Mapea un prefijo/ruta de backend (sin `/api/v1`) al ID canónico de módulo.
 */
export function resolveModuleFromRoutePath(
  rawPath?: string | null,
): ErpModuleId | null {
  if (!rawPath) return null;
  const withoutQuery = rawPath.split('?')[0] || '';
  const cleaned = withoutQuery
    .replace(/^\/+/, '')
    .replace(/^api\/v\d+\//i, '')
    .toLowerCase();

  if (!cleaned) return null;

  // Sub-rutas específicas del módulo de Supervisión y Ranking de Ventas
  if (
    cleaned.startsWith('quotations/sales-ranking') ||
    cleaned.startsWith('quotations/seed-sales-data')
  ) {
    return 'sales';
  }

  // Cambio de contraseña propio está exento de control por módulo
  if (cleaned.startsWith('users/change-password')) {
    return null;
  }

  const segment = cleaned.split('/')[0];
  switch (segment) {
    case 'clients':
      return 'clients';
    case 'inventory':
      return 'inventory';
    case 'providers':
      return 'providers';
    case 'purchases':
      return 'purchases';
    case 'insumos':
      return 'insumos';
    case 'promotions':
    case 'promociones':
      return 'promociones';
    case 'availability':
      return 'availability';
    case 'quotations':
      return 'quotations';
    case 'contracts':
      return 'contracts';
    case 'operations':
    case 'horometros':
      return 'operations';
    case 'billing':
      return 'billing';
    case 'cxc':
      return 'cxc';
    case 'accounting':
      return 'accounting';
    case 'maintenance':
      return 'maintenance';
    case 'auditoria':
    case 'audit':
      return 'audit';
    case 'users':
    case 'roles':
      return 'security';
    case 'auth':
      if (cleaned.startsWith('auth/register')) {
        return 'security';
      }
      return null;
    case 'commissions':
      return 'commissions';
    case 'payroll':
      return 'payroll';
    case 'numbering':
      return 'numbering';
    default:
      return null;
  }
}

/**
 * Catálogos de solo lectura (GET) que un módulo activo necesita consultar para operar
 * (por ejemplo, seleccionar clientes o equipos dentro de Cotizaciones o Contratos,
 * o seleccionar cuenta bancaria en Facturación/CxC). Nunca otorga escritura ni muestra
 * los módulos auxiliares en el menú del usuario.
 */
const AUXILIARY_READ_DEPENDENCIES: Partial<Record<ErpModuleId, ErpModuleId[]>> =
  {
    quotations: [
      'clients',
      'inventory',
      'availability',
      'promociones',
      'numbering',
    ],
    contracts: [
      'clients',
      'inventory',
      'quotations',
      'availability',
      'numbering',
    ],
    operations: ['clients', 'contracts', 'inventory', 'numbering'],
    billing: ['clients', 'contracts', 'quotations', 'numbering'],
    cxc: ['clients', 'billing', 'numbering'],
    accounting: ['clients', 'billing', 'cxc', 'purchases', 'providers'],
    maintenance: ['inventory', 'insumos', 'providers'],
    purchases: ['providers', 'insumos', 'inventory'],
    insumos: ['providers'],
    promociones: ['inventory'],
    availability: ['inventory', 'clients'],
    commissions: ['quotations', 'contracts', 'billing'],
    sales: ['quotations', 'clients'],
    payroll: ['commissions'],
  };

/**
 * Determina si una petición GET a `targetModule` está autorizada como consulta auxiliar
 * para otro módulo al que el usuario sí tiene acceso (LECTURA o ESCRITURA).
 */
export function hasAuxiliaryReadAccess(
  targetModule: ErpModuleId,
  rawPath: string | null | undefined,
  userModulePerms: UserModulePermissionsMap,
): boolean {
  const activeModules = Object.keys(userModulePerms).filter(
    (m): m is ErpModuleId =>
      isValidErpModuleId(m) &&
      (userModulePerms[m] === 'LECTURA' || userModulePerms[m] === 'ESCRITURA'),
  );

  // Para contabilidad, solo exponer bancos/catálogo como lectura auxiliar a Facturación, CxC o Compras
  if (targetModule === 'accounting') {
    const cleaned = (rawPath || '')
      .split('?')[0]
      .replace(/^\/+/, '')
      .replace(/^api\/v\d+\//i, '')
      .toLowerCase();
    const isSafeAccountingLookup =
      cleaned.startsWith('accounting/bancos') ||
      cleaned.startsWith('accounting/catalogo');
    if (
      isSafeAccountingLookup &&
      activeModules.some(
        (m) => m === 'billing' || m === 'cxc' || m === 'purchases',
      )
    ) {
      return true;
    }
    return false;
  }

  for (const activeModule of activeModules) {
    const deps = AUXILIARY_READ_DEPENDENCIES[activeModule];
    if (deps && deps.includes(targetModule)) {
      return true;
    }
  }

  return false;
}
