import { EstadoEquipo } from '@prisma/client';
import {
  isOcupado,
  isEnTaller,
  isBloqueado,
  getEquipmentStateLabel,
  EQUIPMENT_STATE_LABELS,
} from './equipment-status.util';

describe('equipment-status.util', () => {
  describe('isOcupado', () => {
    it.each([
      EstadoEquipo.DESPACHADO,
      EstadoEquipo.RENTADO,
      EstadoEquipo.EN_ALQUILER,
      EstadoEquipo.RESERVADO,
      EstadoEquipo.RETORNO,
      EstadoEquipo.EN_RETORNO,
    ])('retorna true para estado ocupado: %s', (estado) => {
      expect(isOcupado(estado)).toBe(true);
    });

    it.each([
      EstadoEquipo.DISPONIBLE,
      EstadoEquipo.EN_MANTENIMIENTO,
      EstadoEquipo.MANTENIMIENTO,
      EstadoEquipo.FUERA_DE_SERVICIO,
      EstadoEquipo.BAJA,
    ])('retorna false para estado no ocupado: %s', (estado) => {
      expect(isOcupado(estado)).toBe(false);
    });

    it('retorna false para null o undefined', () => {
      expect(isOcupado(null)).toBe(false);
      expect(isOcupado(undefined)).toBe(false);
    });
  });

  describe('isEnTaller', () => {
    it.each([
      EstadoEquipo.EN_MANTENIMIENTO,
      EstadoEquipo.MANTENIMIENTO,
      EstadoEquipo.EN_INSPECCION,
    ])('retorna true para estado en taller: %s', (estado) => {
      expect(isEnTaller(estado)).toBe(true);
    });

    it.each([
      EstadoEquipo.DISPONIBLE,
      EstadoEquipo.DESPACHADO,
      EstadoEquipo.RENTADO,
      EstadoEquipo.RESERVADO,
      EstadoEquipo.BAJA,
    ])('retorna false para estado que no es taller: %s', (estado) => {
      expect(isEnTaller(estado)).toBe(false);
    });
  });

  describe('isBloqueado', () => {
    it.each([
      EstadoEquipo.DESPACHADO,
      EstadoEquipo.RENTADO,
      EstadoEquipo.EN_ALQUILER,
      EstadoEquipo.RESERVADO,
      EstadoEquipo.EN_MANTENIMIENTO,
      EstadoEquipo.MANTENIMIENTO,
      EstadoEquipo.FUERA_DE_SERVICIO,
      EstadoEquipo.BAJA,
    ])('retorna true para estados bloqueados para renta o baja: %s', (estado) => {
      expect(isBloqueado(estado)).toBe(true);
    });

    it('retorna false solo para DISPONIBLE', () => {
      expect(isBloqueado(EstadoEquipo.DISPONIBLE)).toBe(false);
    });
  });

  describe('getEquipmentStateLabel', () => {
    it('cubre los 12 estados de la base de datos', () => {
      const allStates = Object.values(EstadoEquipo);
      expect(allStates.length).toBe(12);
      for (const estado of allStates) {
        expect(EQUIPMENT_STATE_LABELS[estado]).toBeDefined();
        expect(getEquipmentStateLabel(estado)).toBe(EQUIPMENT_STATE_LABELS[estado]);
      }
    });

    it('retorna Desconocido para null o undefined', () => {
      expect(getEquipmentStateLabel(null)).toBe('Desconocido');
      expect(getEquipmentStateLabel(undefined)).toBe('Desconocido');
    });
  });
});
