/**
 * Límites de validación compartidos por los DTOs. Fuente única para el
 * backend y para la tabla que usa el frontend (zod). Moneda: córdobas (C$).
 *
 * Los máximos de dinero caben en las columnas Decimal(12,2) / Decimal(14,4)
 * de PostgreSQL; los demás son límites de negocio razonables que evitan
 * valores absurdos o abusivos (p. ej. 1e308 o textos de megabytes).
 */
export const LIMITS = {
  /** Importes (subtotal, total, descuento, depósito, costos). Decimal(12,2). */
  MONEY_MAX: 999_999_999.99,
  /** Precio unitario de renta. Decimal(14,4) en BD. */
  UNIT_PRICE_MAX: 99_999_999.99,
  /** Unidades por línea de documento. */
  QTY_MAX: 100_000,
  /** Existencias de inventario. */
  STOCK_MAX: 1_000_000,
  /** Días de renta por línea (10 años). */
  DAYS_MAX: 3650,
  /** Vigencia / periodos en días (1 año). */
  PERIOD_DAYS_MAX: 365,
  /** Horas de renta por línea o mínimas de facturación. */
  HOURS_MAX: 100_000,
  /** Lectura de horómetro (horas acumuladas). */
  HOROMETRO_MAX: 1_000_000,
  /** Nivel de combustible (barras, % o pulgadas). */
  FUEL_MAX: 1000,
  /** Porcentajes (comisiones). */
  PERCENT_MAX: 100,
  /** Elementos máximos en listas de líneas (ítems, daños). */
  ITEMS_MAX: 200,
  /** Elementos máximos en listas de ids (roles, permisos). */
  IDS_MAX: 500,
  /** Fotos máximas por inspección. */
  PHOTOS_MAX: 20,

  /** Longitudes máximas de texto. */
  TEXT: {
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
  },
} as const;
