import { describe, it, expect } from 'vitest';
import type { Equipment } from '../inventory/types/inventory.types';
import { createQuotationWithAvailabilitySchema } from './validators/quotation.validator';

export type EquipmentWithAvailability = Equipment & {
  statusPeriodo?: 'DISPONIBLE' | 'OCUPADO' | 'PARCIAL' | 'MANTENIMIENTO';
  cantidadDisponiblePeriodo?: number;
  isAvailable?: boolean;
  fechaEstimadaLiberacion?: string | null;
  motivoOcupacion?: string | null;
};

// Función de validación de disponibilidad y bloqueo estricto (misma lógica que EquipmentSearchModal)
export function evaluateEquipmentSelection(
  e: EquipmentWithAvailability,
  hasRentalPeriod: boolean
) {
  const estadoStr = String(e.estado || '');
  const isMaint =
    e.statusPeriodo === 'MANTENIMIENTO' ||
    estadoStr === 'MANTENIMIENTO' ||
    estadoStr === 'FUERA_DE_SERVICIO' ||
    estadoStr === 'BAJA';

  const dispPeriodo =
    e.cantidadDisponiblePeriodo !== undefined
      ? e.cantidadDisponiblePeriodo
      : e.cantidadDisponible;

  const isOccupied = hasRentalPeriod
    ? e.statusPeriodo === 'OCUPADO' || dispPeriodo <= 0 || !e.isAvailable
    : e.cantidadDisponible <= 0 ||
      estadoStr === 'RENTADO' ||
      estadoStr === 'DESPACHADO';

  const isPartial =
    hasRentalPeriod && e.statusPeriodo === 'PARCIAL' && dispPeriodo > 0;
  const isFree = hasRentalPeriod
    ? e.statusPeriodo === 'DISPONIBLE' && dispPeriodo > 0
    : !isOccupied && !isMaint && e.cantidadDisponible > 0;

  const isDisabled = isMaint || isOccupied || dispPeriodo <= 0;

  return {
    isMaint,
    isOccupied,
    isPartial,
    isFree,
    isDisabled,
    dispPeriodo,
    canSelect: !isDisabled,
  };
}

// Función de validación de cantidad permitida al cotizar (misma lógica que QuotationForm)
export function getPermittedQuotationQuantity(
  tipoControl: 'SERIALIZADO' | 'POR_CANTIDAD' | undefined,
  requestedQty: number,
  cantidadDisponiblePeriodo?: number
): number {
  if (tipoControl === 'SERIALIZADO') {
    return 1;
  }
  if (cantidadDisponiblePeriodo !== undefined) {
    return Math.min(requestedQty, Math.max(1, cantidadDisponiblePeriodo));
  }
  return requestedQty;
}

describe('Quotation & Equipment Availability Strict Blocking Logic', () => {
  const baseEquipment: EquipmentWithAvailability = {
    id: 'eq-retro-1',
    empresaId: 'emp-1',
    sucursalId: 'suc-1',
    categoriaId: 'cat-1',
    marcaId: 'm-1',
    codigo: '08-02',
    descripcion: 'Retroexcavadora Muller MR406',
    modelo: 'Muller MR406',
    estado: 'DESPACHADO',
    cantidadTotal: 1,
    cantidadDisponible: 0,
    horometro: 1250,
    precioRentaDia: 2500,
    createdAt: '',
    updatedAt: '',
  };

  it('strictly disables selection of backhoe 08-02 when DESPACHADO / stock 0 without dates', () => {
    const evalResult = evaluateEquipmentSelection(baseEquipment, false);

    expect(evalResult.isOccupied).toBe(true);
    expect(evalResult.isDisabled).toBe(true);
    expect(evalResult.canSelect).toBe(false);
  });

  it('strictly disables selection of backhoe 08-02 when statusPeriodo is OCUPADO in queried period', () => {
    const occupiedInPeriod: EquipmentWithAvailability = {
      ...baseEquipment,
      statusPeriodo: 'OCUPADO',
      cantidadDisponiblePeriodo: 0,
      isAvailable: false,
      fechaEstimadaLiberacion: '2026-12-04T00:00:00.000Z',
      motivoOcupacion: 'CTR-2026-0001 (Constructora San Carlos)',
    };

    const evalResult = evaluateEquipmentSelection(occupiedInPeriod, true);

    expect(evalResult.isOccupied).toBe(true);
    expect(evalResult.isDisabled).toBe(true);
    expect(evalResult.canSelect).toBe(false);
  });

  it('enables selection when backend confirms equipment is free in a future period', () => {
    const freeFutureEquipment: EquipmentWithAvailability = {
      ...baseEquipment,
      statusPeriodo: 'DISPONIBLE',
      cantidadDisponiblePeriodo: 1,
      isAvailable: true,
      fechaEstimadaLiberacion: null,
      motivoOcupacion: null,
    };

    const evalResult = evaluateEquipmentSelection(freeFutureEquipment, true);

    expect(evalResult.isOccupied).toBe(false);
    expect(evalResult.isFree).toBe(true);
    expect(evalResult.isDisabled).toBe(false);
    expect(evalResult.canSelect).toBe(true);
  });

  it('strictly disables maintenance / out of service equipment', () => {
    const maintEquipment: EquipmentWithAvailability = {
      ...baseEquipment,
      estado: 'MANTENIMIENTO',
      statusPeriodo: 'MANTENIMIENTO',
    };

    const evalResult = evaluateEquipmentSelection(maintEquipment, true);

    expect(evalResult.isMaint).toBe(true);
    expect(evalResult.isDisabled).toBe(true);
    expect(evalResult.canSelect).toBe(false);
  });

  it('strictly disables quantity equipment when available period stock is 0', () => {
    const qtyZeroStock: EquipmentWithAvailability = {
      ...baseEquipment,
      codigo: 'AND-001',
      tipoControl: 'POR_CANTIDAD',
      cantidadTotal: 50,
      cantidadDisponible: 0,
      cantidadDisponiblePeriodo: 0,
      statusPeriodo: 'OCUPADO',
      isAvailable: false,
    };

    const evalResult = evaluateEquipmentSelection(qtyZeroStock, true);

    expect(evalResult.isOccupied).toBe(true);
    expect(evalResult.isDisabled).toBe(true);
    expect(evalResult.canSelect).toBe(false);
  });

  it('enables partial quantity equipment and caps requested quantity to available stock', () => {
    const partialQtyEquipment: EquipmentWithAvailability = {
      ...baseEquipment,
      codigo: 'AND-002',
      tipoControl: 'POR_CANTIDAD',
      cantidadTotal: 50,
      cantidadDisponible: 20,
      cantidadDisponiblePeriodo: 15,
      statusPeriodo: 'PARCIAL',
      isAvailable: true,
    };

    const evalResult = evaluateEquipmentSelection(partialQtyEquipment, true);

    expect(evalResult.isPartial).toBe(true);
    expect(evalResult.isDisabled).toBe(false);
    expect(evalResult.canSelect).toBe(true);

    // Quantity clamping logic test:
    // If user tries to request 25, it must be capped to 15
    const cappedQty = getPermittedQuotationQuantity(
      'POR_CANTIDAD',
      25,
      partialQtyEquipment.cantidadDisponiblePeriodo
    );
    expect(cappedQty).toBe(15);

    // Serialized equipment is strictly capped to 1
    const serializedQty = getPermittedQuotationQuantity('SERIALIZADO', 5, 1);
    expect(serializedQty).toBe(1);
  });
});

export function evaluateModalItemCard(
  e: EquipmentWithAvailability,
  currentItems: { equipoId?: string; productoId?: string; cantidad?: number | string }[] = [],
  hasRentalPeriod = true
) {
  const estadoStr = String(e.estado || '');
  const isMaint =
    e.statusPeriodo === 'MANTENIMIENTO' ||
    estadoStr === 'MANTENIMIENTO' ||
    estadoStr === 'EN_MANTENIMIENTO' ||
    estadoStr === 'FUERA_DE_SERVICIO' ||
    estadoStr === 'BAJA';

  const stockPeriodo =
    e.cantidadDisponiblePeriodo !== undefined
      ? Math.max(0, Number(e.cantidadDisponiblePeriodo) || 0)
      : Math.max(0, Number(e.cantidadDisponible) || 0);

  const cantEnCotizacion = currentItems
    .filter((it) => it.equipoId === e.id || (e.productoId && it.productoId === e.productoId))
    .reduce((sum, it) => sum + (Number(it.cantidad) || 0), 0);

  const quedan = Math.max(0, stockPeriodo - cantEnCotizacion);
  const isSerial = e.tipoControl === 'SERIALIZADO' || Boolean(e.numeroSerie);
  const yaEnCotizacion = cantEnCotizacion > 0;
  const isAgotado = stockPeriodo <= 0 || quedan <= 0;

  const isSerialAlreadyInQuote = isSerial && cantEnCotizacion >= 1;
  const tooltip = isSerialAlreadyInQuote
    ? 'Este equipo con número de serie ya está incluido en la cotización'
    : stockPeriodo <= 0
      ? 'No hay stock disponible para las fechas seleccionadas'
      : `Ya agregaste la totalidad del stock disponible para este período (${stockPeriodo} u.)`;

  const buttonText = isMaint
    ? 'En Mantenimiento'
    : isAgotado
      ? isSerialAlreadyInQuote || cantEnCotizacion >= stockPeriodo
        ? 'Ya agregado'
        : 'Sin stock'
      : yaEnCotizacion
        ? '+ Sumar 1'
        : '+ Agregar';

  const badgeText = isMaint
    ? 'En reparación'
    : isAgotado
      ? 'AGOTADO EN PERÍODO'
      : yaEnCotizacion
        ? `En cotización (${quedan} disponibles)`
        : hasRentalPeriod
          ? 'DISPONIBLE EN PERÍODO'
          : 'DISPONIBLE';

  const canAdd = !isMaint && !isAgotado && quedan > 0;

  return {
    stockPeriodo,
    cantEnCotizacion,
    quedan,
    isAgotado,
    buttonText,
    badgeText,
    tooltip,
    canAdd,
  };
}

describe('EquipmentSearchModal & Quotation Line Inventory Availability Validation', () => {
  const serialEquipment: EquipmentWithAvailability = {
    id: 'eq-serial-01',
    empresaId: 'emp-1',
    sucursalId: 'suc-1',
    categoriaId: 'cat-1',
    codigo: 'RET-01',
    descripcion: 'Retroexcavadora CAT 420F',
    modelo: '420F',
    numeroSerie: 'CAT420F-9921',
    tipoControl: 'SERIALIZADO',
    estado: 'DISPONIBLE',
    cantidadTotal: 1,
    cantidadDisponible: 1,
    cantidadDisponiblePeriodo: 1,
    statusPeriodo: 'DISPONIBLE',
    isAvailable: true,
    precioRentaDia: 3500,
    createdAt: '',
    updatedAt: '',
  };

  const qtyEquipment: EquipmentWithAvailability = {
    id: 'eq-andamio-04',
    empresaId: 'emp-1',
    sucursalId: 'suc-1',
    categoriaId: 'cat-2',
    codigo: 'AND-04',
    descripcion: 'Cuerpo de Andamio Estándar',
    modelo: 'Estándar',
    tipoControl: 'POR_CANTIDAD',
    estado: 'DISPONIBLE',
    cantidadTotal: 10,
    cantidadDisponible: 4,
    cantidadDisponiblePeriodo: 4,
    statusPeriodo: 'PARCIAL',
    isAvailable: true,
    precioRentaDia: 120,
    createdAt: '',
    updatedAt: '',
  };

  it('Producto con stock 1: agregar una vez → botón pasa a "Ya agregado"/deshabilitado; segundo intento no agrega', () => {
    // 1. Estado inicial antes de agregar a la cotización
    const initialCard = evaluateModalItemCard(serialEquipment, []);
    expect(initialCard.stockPeriodo).toBe(1);
    expect(initialCard.cantEnCotizacion).toBe(0);
    expect(initialCard.quedan).toBe(1);
    expect(initialCard.buttonText).toBe('+ Agregar');
    expect(initialCard.canAdd).toBe(true);
    expect(initialCard.badgeText).toBe('DISPONIBLE EN PERÍODO');

    // 2. Se agrega a la cotización (ahora cantEnCotizacion = 1)
    const afterAddCard = evaluateModalItemCard(serialEquipment, [
      { equipoId: serialEquipment.id, cantidad: 1 },
    ]);
    expect(afterAddCard.stockPeriodo).toBe(1);
    expect(afterAddCard.cantEnCotizacion).toBe(1);
    expect(afterAddCard.quedan).toBe(0);
    expect(afterAddCard.isAgotado).toBe(true);
    expect(afterAddCard.buttonText).toBe('Ya agregado');
    expect(afterAddCard.badgeText).toBe('AGOTADO EN PERÍODO');
    expect(afterAddCard.canAdd).toBe(false);
    expect(afterAddCard.tooltip).toContain('ya está incluido en la cotización');
  });

  it('Producto con stock 4: agregar 3 → "Quedan: 1" y botón "+ Sumar 1"', () => {
    const card = evaluateModalItemCard(qtyEquipment, [
      { equipoId: qtyEquipment.id, cantidad: 3 },
    ]);
    expect(card.stockPeriodo).toBe(4);
    expect(card.cantEnCotizacion).toBe(3);
    expect(card.quedan).toBe(1);
    expect(card.isAgotado).toBe(false);
    expect(card.buttonText).toBe('+ Sumar 1');
    expect(card.badgeText).toBe('En cotización (1 disponibles)');
    expect(card.canAdd).toBe(true);
  });

  it('Producto con stock 4: agregar 4 → botón pasa a "Ya agregado" / "Sin stock" y queda en 0', () => {
    const card = evaluateModalItemCard(qtyEquipment, [
      { equipoId: qtyEquipment.id, cantidad: 4 },
    ]);
    expect(card.stockPeriodo).toBe(4);
    expect(card.cantEnCotizacion).toBe(4);
    expect(card.quedan).toBe(0);
    expect(card.isAgotado).toBe(true);
    expect(card.buttonText).toBe('Ya agregado');
    expect(card.badgeText).toBe('AGOTADO EN PERÍODO');
    expect(card.canAdd).toBe(false);
  });

  it('Producto con stock 4: intentar cantidad 5 en la línea genera error de validación', () => {
    const schema = createQuotationWithAvailabilitySchema(
      {
        [qtyEquipment.id]: {
          disponible: 4,
          nombre: qtyEquipment.descripcion,
          isSerialized: false,
        },
      },
      { inicio: '2026-10-10', fin: '2026-10-12' },
    );

    const payloadInvalido = {
      clienteId: 'cli-1',
      validezDias: 15,
      descuento: 0,
      subtotal: 600,
      iva: 90,
      total: 690,
      items: [
        {
          equipoId: qtyEquipment.id,
          descripcion: qtyEquipment.descripcion,
          tipoCobro: 'POR_DIA' as const,
          tipoTarifa: 'DIA' as const,
          cantidad: 5, // Excede el disponible 4
          dias: 2,
          precioUnitario: 120,
          descuento: 0,
          subtotal: 600,
        },
      ],
    };

    const res = schema.safeParse(payloadInvalido);
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes('cantidad'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('No hay suficiente stock de Cuerpo de Andamio Estándar: solicitado 5, disponible 4 del 2026-10-10 al 2026-10-12.');
    }
  });

  it('Dos líneas del mismo producto (datos antiguos) se suman para validar stock del período', () => {
    const schema = createQuotationWithAvailabilitySchema(
      {
        [qtyEquipment.id]: {
          disponible: 4,
          nombre: qtyEquipment.descripcion,
          isSerialized: false,
        },
      },
      { inicio: '2026-10-10', fin: '2026-10-12' },
    );

    const payloadDosLineasExcedido = {
      clienteId: 'cli-1',
      validezDias: 15,
      descuento: 0,
      subtotal: 600,
      iva: 90,
      total: 690,
      items: [
        {
          equipoId: qtyEquipment.id,
          descripcion: 'Línea 1 Andamio',
          tipoCobro: 'POR_DIA' as const,
          tipoTarifa: 'DIA' as const,
          cantidad: 3,
          dias: 2,
          precioUnitario: 120,
          descuento: 0,
          subtotal: 360,
        },
        {
          equipoId: qtyEquipment.id,
          descripcion: 'Línea 2 Andamio',
          tipoCobro: 'POR_DIA' as const,
          tipoTarifa: 'DIA' as const,
          cantidad: 2, // Total acumulado: 3 + 2 = 5 > 4 disponible
          dias: 2,
          precioUnitario: 120,
          descuento: 0,
          subtotal: 240,
        },
      ],
    };

    const res = schema.safeParse(payloadDosLineasExcedido);
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes('cantidad'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('No hay suficiente stock de Cuerpo de Andamio Estándar: solicitado 5, disponible 4');
    }
  });

  it('Cambiar fechas de cotización y que baje el stock bloquea el guardado', () => {
    // Escenario 1: Rango A tiene 4 disponibles -> cantidad 3 es válida
    const schemaFechasOriginales = createQuotationWithAvailabilitySchema(
      {
        [qtyEquipment.id]: { disponible: 4, nombre: qtyEquipment.descripcion },
      },
      { inicio: '2026-10-10', fin: '2026-10-12' },
    );

    const payload = {
      clienteId: 'cli-1',
      validezDias: 15,
      descuento: 0,
      subtotal: 360,
      iva: 54,
      total: 414,
      items: [
        {
          equipoId: qtyEquipment.id,
          descripcion: qtyEquipment.descripcion,
          tipoCobro: 'POR_DIA' as const,
          tipoTarifa: 'DIA' as const,
          cantidad: 3,
          dias: 2,
          precioUnitario: 120,
          descuento: 0,
          subtotal: 360,
        },
      ],
    };

    expect(schemaFechasOriginales.safeParse(payload).success).toBe(true);

    // Escenario 2: El usuario cambia las fechas y el backend reporta disponible = 2
    // La línea que tenía cantidad 3 ahora excede el stock y falla la validación
    const schemaNuevasFechas = createQuotationWithAvailabilitySchema(
      {
        [qtyEquipment.id]: { disponible: 2, nombre: qtyEquipment.descripcion },
      },
      { inicio: '2026-10-15', fin: '2026-10-25' },
    );

    const resCambio = schemaNuevasFechas.safeParse(payload);
    expect(resCambio.success).toBe(false);
    if (!resCambio.success) {
      const issue = resCambio.error.issues.find((i) => i.path.includes('cantidad'));
      expect(issue?.message).toContain('solicitado 3, disponible 2 del 2026-10-15 al 2026-10-25');
    }
  });

  it('Equipo serializado repetido en la misma cotización falla validación', () => {
    const schemaSerial = createQuotationWithAvailabilitySchema(
      {
        [serialEquipment.id]: {
          disponible: 1,
          nombre: serialEquipment.descripcion,
          isSerialized: true,
        },
      },
      { inicio: '2026-10-10', fin: '2026-10-12' },
    );

    const payloadSerialDuplicado = {
      clienteId: 'cli-1',
      validezDias: 15,
      descuento: 0,
      subtotal: 7000,
      iva: 1050,
      total: 8050,
      items: [
        {
          equipoId: serialEquipment.id,
          descripcion: 'Línea 1 Retro CAT',
          tipoCobro: 'POR_DIA' as const,
          tipoTarifa: 'DIA' as const,
          cantidad: 1,
          dias: 2,
          precioUnitario: 3500,
          descuento: 0,
          subtotal: 7000,
        },
        {
          equipoId: serialEquipment.id,
          descripcion: 'Línea 2 Retro CAT repetida',
          tipoCobro: 'POR_DIA' as const,
          tipoTarifa: 'DIA' as const,
          cantidad: 1,
          dias: 2,
          precioUnitario: 3500,
          descuento: 0,
          subtotal: 7000,
        },
      ],
    };

    const res = schemaSerial.safeParse(payloadSerialDuplicado);
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.includes('equipoId'));
      expect(issue?.message).toContain('Este equipo serializado no puede agregarse más de una vez');
    }
  });
});
