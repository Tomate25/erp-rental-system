import { describe, expect, it } from 'vitest';
import {
  buildEquipmentPayload,
  canSetEquipmentBaja,
  getEquipmentFormStateOptions,
  getUserRoleNames,
} from './equipment-form';
import type { EquipmentFormValues } from '../validators/inventory.validator';

const base: EquipmentFormValues = {
  codigo: '',
  modelo: 'Retroexcavadora 420F',
  numeroSerie: '',
  categoriaId: 'cat-1',
  subcategoriaId: '',
  marcaId: 'marca-1',
  precioRentaDia: 1500,
  cantidadTotal: 1,
  cantidadDisponible: 1,
  horometro: 0,
  sucursalId: 'suc-1',
  estado: 'DISPONIBLE',
};

describe('buildEquipmentPayload: alta', () => {
  it('omite subcategoriaId, codigo y numeroSerie vacios', () => {
    const payload = buildEquipmentPayload(base, null);
    expect(payload.subcategoriaId).toBeUndefined();
    expect(payload.codigo).toBeUndefined();
    expect(payload.numeroSerie).toBeUndefined();
    expect('subcategoriaId' in payload).toBe(false);
    expect('codigo' in payload).toBe(false);
    expect('numeroSerie' in payload).toBe(false);
    expect(payload.modelo).toBe('Retroexcavadora 420F');
  });

  it('omite los que traen solo espacios, null o undefined', () => {
    const payload = buildEquipmentPayload({ ...base, codigo: '   ', numeroSerie: null, subcategoriaId: undefined }, undefined);
    expect(payload.codigo).toBeUndefined();
    expect(payload.numeroSerie).toBeUndefined();
    expect(payload.subcategoriaId).toBeUndefined();
  });

  it('envia los que tienen valor', () => {
    const payload = buildEquipmentPayload({ ...base, codigo: 'EQ-1', numeroSerie: 'SN-9', subcategoriaId: 'sub-1' }, null);
    expect(payload.codigo).toBe('EQ-1');
    expect(payload.numeroSerie).toBe('SN-9');
    expect(payload.subcategoriaId).toBe('sub-1');
  });
});

describe('buildEquipmentPayload: edicion', () => {
  it('envia null si el equipo tenia subcategoria y el usuario la quito', () => {
    expect(buildEquipmentPayload(base, { subcategoriaId: 'sub-1' }).subcategoriaId).toBeNull();
  });

  it('omite subcategoriaId si no tenia y sigue vacia', () => {
    expect('subcategoriaId' in buildEquipmentPayload(base, { subcategoriaId: null })).toBe(false);
    expect('subcategoriaId' in buildEquipmentPayload(base, { subcategoriaId: undefined })).toBe(false);
    expect('subcategoriaId' in buildEquipmentPayload(base, { subcategoriaId: '' })).toBe(false);
  });

  it('mantiene la subcategoria si el usuario eligio una', () => {
    expect(buildEquipmentPayload({ ...base, subcategoriaId: 'sub-2' }, { subcategoriaId: 'sub-1' }).subcategoriaId).toBe('sub-2');
  });

  it('omite codigo y numeroSerie vacios (sin semantica de borrado)', () => {
    const payload = buildEquipmentPayload(base, { subcategoriaId: 'sub-1' });
    expect('codigo' in payload).toBe(false);
    expect('numeroSerie' in payload).toBe(false);
  });
});

describe('BAJA solo para ADMIN y GERENTE', () => {
  const valores = (roles: string[]) => getEquipmentFormStateOptions(roles).map((o) => o.value);

  it('la oculta para otros roles o sin roles', () => {
    expect(valores(['COMERCIAL'])).toEqual(['DISPONIBLE', 'FUERA_DE_SERVICIO']);
    expect(valores([])).not.toContain('BAJA');
    expect(canSetEquipmentBaja(['COMERCIAL', 'OPERADOR'])).toBe(false);
  });

  it('la muestra para ADMIN y GERENTE', () => {
    expect(valores(['ADMIN'])).toContain('BAJA');
    expect(valores(['COMERCIAL', 'GERENTE'])).toContain('BAJA');
    expect(canSetEquipmentBaja(['ADMIN'])).toBe(true);
  });

  it('lee roles como strings o como objetos', () => {
    expect(getUserRoleNames({ roles: ['ADMIN', { nombre: 'GERENTE' }, { rol: { nombre: 'COMERCIAL' } }, null] })).toEqual([
      'ADMIN',
      'GERENTE',
      'COMERCIAL',
    ]);
    expect(getUserRoleNames(null)).toEqual([]);
    expect(getUserRoleNames({})).toEqual([]);
  });
});