/**
 * Límites de validación copiados a mano de la tabla de límites de DTOs del backend
 * (`tabla_limites_dtos.md`, generada desde class-validator, 2026-10-04). Moneda: córdobas (C$).
 *
 * No se importa código del backend: si el backend cambia un límite, hay que actualizarlo aquí.
 * Los helpers zod reutilizables (`money`, `qty`, `isoDate`) están en `./helpers.ts`.
 */

/** Constantes globales (`src/common/validation/dto-limits.ts` del backend). */
export const GLOBAL_LIMITS = {
  /** Importes (subtotal, total, depósito, costos) — Decimal(12,2). */
  MONEY_MAX: 999999999.99,
  /** Precio unitario de renta (hasta 4 decimales). */
  UNIT_PRICE_MAX: 99999999.99,
  /** Unidades por línea. */
  QTY_MAX: 100000,
  /** Existencias de inventario. */
  STOCK_MAX: 1000000,
  /** Días de renta por línea. */
  DAYS_MAX: 3650,
  /** Vigencia / periodos en días. */
  PERIOD_DAYS_MAX: 365,
  /** Horas por línea / mínimas. */
  HOURS_MAX: 100000,
  /** Horas totales por línea con tarifa HORA (3650 días x 24 h). Acordado con backend (b9ae54b). */
  HOURS_TOTAL_MAX: 87600,
  /** Lectura de horómetro. */
  HOROMETRO_MAX: 1000000,
  /** Nivel de combustible. */
  FUEL_MAX: 1000,
  /** Porcentajes (comisiones). */
  PERCENT_MAX: 100,
  /** Líneas por documento. */
  ITEMS_MAX: 200,
  /** Ids por lista (roles, permisos). */
  IDS_MAX: 500,
  /** Fotos por inspección. */
  PHOTOS_MAX: 20,
} as const;

/** Longitudes máximas de texto (`TEXT.*` del backend). */
export const TEXT_LIMITS = {
  ID: 64,
  NAME: 120,
  CODE: 60,
  SERIAL: 100,
  EMAIL: 254,
  PHONE: 30,
  ADDRESS: 300,
  SHORT: 200,
  NOTES: 2000,
  URL: 500,
  PASSWORD: 128,
  TOKEN: 2048,
} as const;

/**
 * Tope real de las columnas Decimal(12,2) de PostgreSQL (10 enteros + 2 decimales): `DECIMAL_12_2_MAX` de
 * `billing/dto/create-invoice.dto.ts` (backend). Lo usan el abono (`monto`) y `retencionIva`; es mayor que
 * `GLOBAL_LIMITS.MONEY_MAX`, que es un tope de negocio para importes de documentos.
 */
export const DECIMAL_12_2_MAX = 9999999999.99;

const G = GLOBAL_LIMITS;

/** Rango numérico: `decimales` solo se define cuando el backend impone máximo de decimales. */
export interface NumericLimit {
  readonly min: number;
  readonly max: number;
  readonly decimales?: number;
}

const importe: NumericLimit = { min: 0, max: G.MONEY_MAX, decimales: 2 };
/** Importes que el servidor recalcula: solo rango, sin máximo de decimales. */
const importeCalculado: NumericLimit = { min: 0, max: G.MONEY_MAX };
const precioUnitario: NumericLimit = { min: 0, max: G.UNIT_PRICE_MAX, decimales: 4 };
const cantidadLinea: NumericLimit = { min: 1, max: G.QTY_MAX };
const diasLinea: NumericLimit = { min: 1, max: G.DAYS_MAX };
/**
 * Tarifa HORA: `dias` y `horas` son horas totales, de 0,01 a 87600 con máximo 2 decimales
 * (se tolera 1e-6 de ruido de coma flotante; ver `shared/validation/dias-horas.ts`).
 */
const horasTotales: NumericLimit = { min: 0.01, max: G.HOURS_TOTAL_MAX, decimales: 2 };
/** Tarifa DIA: `horas` es opcional, de 0 a 87600 con máximo 2 decimales. */
const horasConTarifaDia: NumericLimit = { min: 0, max: G.HOURS_TOTAL_MAX, decimales: 2 };
const horometro: NumericLimit = { min: 0, max: G.HOROMETRO_MAX };
const combustible: NumericLimit = { min: 0, max: G.FUEL_MAX };

/** Límites por entidad, tal como están en la tabla de DTOs del backend. */
export const LIMITS = {
  global: G,
  texto: TEXT_LIMITS,

  auth: {
    email: TEXT_LIMITS.EMAIL,
    /** El backend valida longitud mínima 6 (login, registro y crear usuario). */
    password: { min: 6, max: TEXT_LIMITS.PASSWORD },
    nombre: TEXT_LIMITS.NAME,
    apellido: TEXT_LIMITS.NAME,
    rolNombre: TEXT_LIMITS.NAME,
    rolesMax: 20,
    refreshToken: TEXT_LIMITS.TOKEN,
  },

  usuario: {
    email: TEXT_LIMITS.EMAIL,
    password: { min: 6, max: TEXT_LIMITS.PASSWORD },
    nombre: TEXT_LIMITS.NAME,
    apellido: TEXT_LIMITS.NAME,
    /** Máximo de roles por usuario y longitud de cada nombre de rol. */
    rolesMax: 20,
    rol: TEXT_LIMITS.NAME,
    rolIdsMax: 20,
    rolId: TEXT_LIMITS.ID,
    cambioPassword: {
      oldPassword: TEXT_LIMITS.PASSWORD,
      newPassword: { min: 8, max: TEXT_LIMITS.PASSWORD },
    },
  },

  rol: {
    nombre: TEXT_LIMITS.NAME,
    descripcion: TEXT_LIMITS.SHORT,
    permisoIdsMax: G.IDS_MAX,
    permisoId: TEXT_LIMITS.ID,
  },

  cliente: {
    numeroCliente: TEXT_LIMITS.CODE,
    nombre: TEXT_LIMITS.SHORT,
    razonSocial: TEXT_LIMITS.SHORT,
    /** RFC/RUC y cédula: 30 caracteres en el backend. */
    rfc: 30,
    cedula: 30,
    direccion: TEXT_LIMITS.ADDRESS,
    emailFacturacion: TEXT_LIMITS.EMAIL,
    telefono: TEXT_LIMITS.PHONE,
    telMovistar: TEXT_LIMITS.PHONE,
    telClaro: TEXT_LIMITS.PHONE,
    telConvencional: TEXT_LIMITS.PHONE,
    vendedor: TEXT_LIMITS.NAME,
    limiteCredito: importe,
    condicionPago: TEXT_LIMITS.NAME,
    whatsappNumero: TEXT_LIMITS.PHONE,
    tipoCliente: TEXT_LIMITS.SHORT,
    nombreContacto: TEXT_LIMITS.SHORT,
    nombreOriginal: TEXT_LIMITS.SHORT,
    departamento: TEXT_LIMITS.SHORT,
    observaciones: TEXT_LIMITS.NOTES,
  },

  equipo: {
    modelo: TEXT_LIMITS.SHORT,
    codigo: TEXT_LIMITS.CODE,
    numeroSerie: TEXT_LIMITS.SERIAL,
    cantidadTotal: { min: 0, max: G.STOCK_MAX } as NumericLimit,
    cantidadDisponible: { min: 0, max: G.STOCK_MAX } as NumericLimit,
    precioRentaDia: precioUnitario,
    precioRentaHora: precioUnitario,
    minimoHoras: { min: 0, max: G.HOURS_MAX, decimales: 2 } as NumericLimit,
    costoAdquisicion: importe,
    horometro,
    descripcion: TEXT_LIMITS.NOTES,
    /** `tipoControl`: SERIALIZADO | POR_CANTIDAD. `tipoMedicionCombustible`: BARRAS | PORCENTAJE | PULGADAS. */
  },

  producto: {
    nombre: TEXT_LIMITS.SHORT,
    codigo: TEXT_LIMITS.CODE,
    descripcion: TEXT_LIMITS.NOTES,
    precioRentaDia: precioUnitario,
    precioRentaHora: precioUnitario,
    minimoHoras: { min: 1, max: G.HOURS_MAX, decimales: 2 } as NumericLimit,
  },

  comision: {
    nombreVendedor: TEXT_LIMITS.NAME,
    monto: importe,
    porcentaje: { min: 0, max: G.PERCENT_MAX, decimales: 2 } as NumericLimit,
  },

  contrato: {
    condiciones: TEXT_LIMITS.NOTES,
    depositoGarantia: importe,
    periodoDiasCorte: { min: 1, max: G.PERIOD_DAYS_MAX } as NumericLimit,
    itemsMax: G.ITEMS_MAX,
    item: {
      descripcion: TEXT_LIMITS.SHORT,
      modelo: TEXT_LIMITS.SHORT,
      cantidad: cantidadLinea,
      /** `dias`: entero 1-3650 con tarifa DIA; con tarifa HORA usar `diasHora`. */
      dias: diasLinea,
      diasHora: horasTotales,
      /** `horas`: 0,01-87600 con tarifa HORA (`horasHora`); 0-87600 con tarifa DIA. */
      horas: horasConTarifaDia,
      horasHora: horasTotales,
      horasPorDia: { min: 0.01, max: 24, decimales: 2 } as NumericLimit,
      precioRenta: precioUnitario,
      descuento: importeCalculado,
      subtotal: importeCalculado,
      horometroInicial: horometro,
    },
  },

  corte: {
    numeroCorte: { min: 1, max: 1000 } as NumericLimit,
    monto: importe,
    horasPorDia: { min: 0.01, max: 24, decimales: 2 } as NumericLimit,
    periodoDias: { min: 1, max: G.PERIOD_DAYS_MAX } as NumericLimit,
    cantidadCortes: { min: 1, max: 120 } as NumericLimit,
    horasPorDiaPorItemMax: G.ITEMS_MAX,
  },

  horometro: {
    horometroNuevo: horometro,
    observaciones: TEXT_LIMITS.NOTES,
  },

  mantenimiento: {
    horometroServicio: horometro,
    descripcion: TEXT_LIMITS.NOTES,
    costo: importe,
    insumosUtilizados: TEXT_LIMITS.NOTES,
    gastosMax: G.ITEMS_MAX,
    gasto: {
      descripcion: TEXT_LIMITS.SHORT,
      monto: { min: 0.01, max: G.MONEY_MAX, decimales: 2 } as NumericLimit,
      comprobanteUrl: TEXT_LIMITS.URL,
    },
  },

  operaciones: {
    solicitadoPor: TEXT_LIMITS.NAME,
    direccionEntrega: TEXT_LIMITS.ADDRESS,
    lugarRecoleccion: TEXT_LIMITS.ADDRESS,
    comentarios: TEXT_LIMITS.NOTES,
    observaciones: TEXT_LIMITS.NOTES,
    operadorNombre: TEXT_LIMITS.NAME,
    vehiculoEnvio: TEXT_LIMITS.NAME,
    itemsMax: G.ITEMS_MAX,
    inspeccionSalida: {
      combustible: TEXT_LIMITS.CODE,
      nivelCombustible: combustible,
    },
    itemDespacho: {
      numeroSerie: TEXT_LIMITS.SERIAL,
      cantidad: cantidadLinea,
      horometroInicial: horometro,
    },
    inspeccionDano: {
      componente: TEXT_LIMITS.NAME,
      tipoDano: TEXT_LIMITS.NAME,
      costoEstimado: importe,
    },
    inspeccionEstado: {
      fotosUrlsMax: G.PHOTOS_MAX,
      fotoUrl: TEXT_LIMITS.URL,
    },
    itemDevolucion: {
      numeroSerie: TEXT_LIMITS.SERIAL,
      cantidad: { min: 0, max: G.QTY_MAX } as NumericLimit,
      horometroFinal: horometro,
      combustibleRetorno: TEXT_LIMITS.CODE,
      nivelCombustible: combustible,
      cargoCombustible: importe,
      descripcionDanios: TEXT_LIMITS.NOTES,
      daniosMax: G.ITEMS_MAX,
    },
    retorno: {
      entregadoPor: TEXT_LIMITS.NAME,
      cedulaEntregante: 30,
      recibidoPor: TEXT_LIMITS.NAME,
    },
  },

  cotizacion: {
    clienteId: TEXT_LIMITS.ID,
    asesorId: TEXT_LIMITS.ID,
    proyecto: TEXT_LIMITS.SHORT,
    atencion: TEXT_LIMITS.SHORT,
    telefono: TEXT_LIMITS.PHONE,
    email: TEXT_LIMITS.EMAIL,
    referencia: TEXT_LIMITS.SHORT,
    validezDias: { min: 1, max: G.PERIOD_DAYS_MAX } as NumericLimit,
    /** Cotización pública: la vigencia llega hasta 60 días. */
    validezDiasPublica: { min: 1, max: 60 } as NumericLimit,
    condiciones: TEXT_LIMITS.NOTES,
    notasRevision: TEXT_LIMITS.NOTES,
    subtotal: importeCalculado,
    descuento: importeCalculado,
    iva: importeCalculado,
    total: importeCalculado,
    depositoGarantia: importe,
    itemsMax: G.ITEMS_MAX,
    item: {
      equipoId: TEXT_LIMITS.ID,
      productoId: TEXT_LIMITS.ID,
      descripcion: TEXT_LIMITS.SHORT,
      cantidad: cantidadLinea,
      /** `dias`: entero 1-3650 con tarifa DIA; con tarifa HORA usar `diasHora`. */
      dias: diasLinea,
      diasHora: horasTotales,
      /** `horas`: 0,01-87600 con tarifa HORA (`horasHora`); 0-87600 con tarifa DIA. */
      horas: horasConTarifaDia,
      horasHora: horasTotales,
      precioUnitario,
      descuento: importeCalculado,
      subtotal: importeCalculado,
    },
    rechazo: { motivo: { min: 5, max: 1000 } },
    envioEmail: { emailDestino: TEXT_LIMITS.EMAIL, notasAdicionales: 500 },
  },

  /** `RegisterPaymentDto` (POST /billing/invoices/:id/payment, backend eba295c). Solo `monto` es obligatorio. */
  pago: {
    monto: { min: 0.01, max: DECIMAL_12_2_MAX, decimales: 2 } as NumericLimit,
    referencia: TEXT_LIMITS.SHORT,
    banco: TEXT_LIMITS.NAME,
    comprobanteUrl: TEXT_LIMITS.URL,
  },

  /** `CreateInvoiceDto` (POST /billing/invoice-quote/:id y /billing/invoice-corte/:corteId). Todo es opcional. */
  factura: {
    plazoCreditoDias: { min: 0, max: G.PERIOD_DAYS_MAX } as NumericLimit,
    retencionIva: { min: 0, max: DECIMAL_12_2_MAX, decimales: 2 } as NumericLimit,
  },

  auditoria: {
    page: { min: 1 },
    limit: { min: 1, max: 100 } as NumericLimit,
    accion: 120,
    modulo: 120,
    entidadTipo: 120,
    entidadId: TEXT_LIMITS.ID,
    usuarioId: TEXT_LIMITS.ID,
    requestId: 128,
  },
} as const;
