import { describe, expect, it } from 'vitest';
import { equipmentSchema } from './inventory.validator';
import {
  EQUIPMENT_STATE_LABELS,
  getEquipmentStateLabel,
  isEditableEquipmentState,
} from '../constants/equipment-status';

const valido = {
  modelo: 'Retroexcavadora 420F',
  categoriaId: 'cat-1',
  marcaId: 'marca-1',
  precioRentaDia: 1500,
  cantidadTotal: 1,
  cantidadDisponible: 1,
  horometro: 120.5,
  sucursalId: 'suc-1',
  estado: 'DISPONIBLE',
};

const mensajes = (input: unknown): string[] => {
  const r = equipmentSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('equipmentSchema: límites del backend', () => {
  it('acepta un equipo válido, con y sin estado', () => {
    expect(equipmentSchema.safeParse(valido).success).toBe(true);
    expect(equipmentSchema.safeParse({ ...valido, estado: undefined }).success).toBe(true);
  });

  it('acepta textos en el límite y rechaza los más largos', () => {
    expect(equipmentSchema.safeParse({ ...valido, modelo: 'm'.repeat(200), codigo: 'c'.repeat(60), numeroSerie: 's'.repeat(100), descripcion: 'd'.repeat(2000) }).success).toBe(true);
    expect(mensajes({ ...valido, modelo: 'm'.repeat(201) })).toContain('El producto o modelo no puede superar 200 caracteres');
    expect(mensajes({ ...valido, codigo: 'c'.repeat(61) })).toContain('El código no puede superar 60 caracteres');
    expect(mensajes({ ...valido, numeroSerie: 's'.repeat(101) })).toContain('El número de serie no puede superar 100 caracteres');
    expect(mensajes({ ...valido, descripcion: 'd'.repeat(2001) })[0]).toMatch(/^La descripción no puede superar .+ caracteres$/);
  });

  it('mantiene los requeridos', () => {
    expect(mensajes({ ...valido, modelo: '' })).toContain('El producto o modelo es requerido');
    expect(mensajes({ ...valido, categoriaId: '' })).toContain('La categoría es requerida');
    expect(mensajes({ ...valido, marcaId: '' })).toContain('La marca es requerida');
    expect(mensajes({ ...valido, sucursalId: '' })).toContain('La sucursal de asignación es requerida');
  });

  it('rechaza precio negativo, sobre el tope o con más de 4 decimales', () => {
    expect(mensajes({ ...valido, precioRentaDia: -1 })).toContain('El precio por día no puede ser negativo');
    expect(mensajes({ ...valido, precioRentaDia: 100000000 }).join(' ')).toContain('El precio por día no puede ser mayor a');
    expect(mensajes({ ...valido, precioRentaDia: 10.12345 })).toContain('El precio por día admite como máximo 4 decimales');
    expect(equipmentSchema.safeParse({ ...valido, precioRentaDia: 10.1234, precioRentaHora: 99999999.99 }).success).toBe(true);
    expect(mensajes({ ...valido, precioRentaHora: -0.5 })).toContain('El precio por hora no puede ser negativo');
  });

  it('valida mínimo de horas: rango y 2 decimales', () => {
    expect(equipmentSchema.safeParse({ ...valido, minimoHoras: 8 }).success).toBe(true);
    expect(equipmentSchema.safeParse({ ...valido, minimoHoras: 2.5 }).success).toBe(true);
    expect(mensajes({ ...valido, minimoHoras: 2.555 })).toContain('El mínimo de horas admite como máximo 2 decimales');
    expect(mensajes({ ...valido, minimoHoras: 100001 }).join(' ')).toContain('El mínimo de horas no puede ser mayor a');
  });

  it('valida cantidades enteras entre 0 y 1,000,000', () => {
    expect(equipmentSchema.safeParse({ ...valido, cantidadTotal: 0, cantidadDisponible: 0 }).success).toBe(true);
    expect(equipmentSchema.safeParse({ ...valido, cantidadTotal: 1000000 }).success).toBe(true);
    expect(equipmentSchema.safeParse({ ...valido, cantidadTotal: 1000001 }).success).toBe(false);
    expect(equipmentSchema.safeParse({ ...valido, cantidadTotal: -1 }).success).toBe(false);
    expect(mensajes({ ...valido, cantidadDisponible: 1.5 })).toContain('La cantidad disponible debe ser un número entero');
  });

  it('valida el horómetro (0 a 1,000,000, sin tope de decimales)', () => {
    expect(equipmentSchema.safeParse({ ...valido, horometro: 0.1 * 3 }).success).toBe(true);
    expect(mensajes({ ...valido, horometro: -1 })).toContain('El horómetro no puede ser negativo');
    expect(equipmentSchema.safeParse({ ...valido, horometro: 1000001 }).success).toBe(false);
  });

  it('NaN (campo numérico vacío) da un mensaje en español', () => {
    expect(mensajes({ ...valido, precioRentaDia: Number.NaN })).toContain('El precio por día debe ser un número válido');
  });
});

describe('equipmentSchema: modalidadRenta fuera del payload', () => {
  it('descarta modalidadRenta aunque llegue en los datos', () => {
    const r = equipmentSchema.safeParse({ ...valido, modalidadRenta: 'SOLO_DIA' });
    expect(r.success).toBe(true);
    if (r.success) expect('modalidadRenta' in r.data).toBe(false);
  });
});

describe('equipmentSchema: estados de edición manual', () => {
  it.each(['DISPONIBLE', 'FUERA_DE_SERVICIO', 'BAJA'])('acepta %s', (estado) => {
    expect(equipmentSchema.safeParse({ ...valido, estado }).success).toBe(true);
  });

  it.each(['RESERVADO', 'DESPACHADO', 'EN_MANTENIMIENTO', 'RENTADO', 'RETORNO', 'MANTENIMIENTO', 'EN_ALQUILER', 'xyz', ''])(
    'rechaza %s',
    (estado) => {
      const r = equipmentSchema.safeParse({ ...valido, estado });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].message).toContain('Estado no permitido');
    },
  );
});

describe('constantes de estados de equipo', () => {
  it('etiquetas en español acordadas', () => {
    expect(EQUIPMENT_STATE_LABELS).toEqual({
      DISPONIBLE: 'Disponible',
      RESERVADO: 'Reservado',
      DESPACHADO: 'Despachado (en poder del cliente)',
      EN_MANTENIMIENTO: 'En mantenimiento',
      FUERA_DE_SERVICIO: 'Fuera de servicio',
      BAJA: 'Dada de baja',
    });
  });

  it('los estados heredados o desconocidos muestran "Estado heredado"', () => {
    for (const estado of ['RENTADO', 'RETORNO', 'MANTENIMIENTO', 'LO_QUE_SEA', '', undefined, null]) {
      expect(getEquipmentStateLabel(estado)).toBe('Estado heredado');
    }
    expect(getEquipmentStateLabel('BAJA')).toBe('Dada de baja');
  });

  it('solo DISPONIBLE, FUERA_DE_SERVICIO y BAJA son editables', () => {
    expect(['DISPONIBLE', 'FUERA_DE_SERVICIO', 'BAJA'].every(isEditableEquipmentState)).toBe(true);
    expect(['RESERVADO', 'DESPACHADO', 'EN_MANTENIMIENTO', 'RENTADO'].some(isEditableEquipmentState)).toBe(false);
  });
});
