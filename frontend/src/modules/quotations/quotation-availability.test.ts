import { describe, it, expect } from 'vitest';
import type { Equipment } from '../inventory/types/inventory.types';

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
