import { describe, it, expect } from 'vitest';
import { formatEquipmentFullName } from './equipment-description';

describe('formatEquipmentFullName', () => {
  it('combina descripcion y modelo cuando el cliente lleva andamios u otros equipos con medidas en modelo', () => {
    expect(
      formatEquipmentFullName(
        {
          codigo: '06-03',
          descripcion: 'ANDAMIO STANDAR',
          modelo: '1.50MTS X 1.70MTS',
        },
        { includeCode: true },
      ),
    ).toBe('[06-03] ANDAMIO STANDAR · 1.50MTS X 1.70MTS');

    expect(
      formatEquipmentFullName({
        descripcion: 'ANDAMIO INDUSTTRIAL',
        modelo: '2MTS X 1.20MTS',
      }),
    ).toBe('ANDAMIO INDUSTTRIAL · 2MTS X 1.20MTS');
  });

  it('agrega serie sin duplicar código ni S/M', () => {
    expect(
      formatEquipmentFullName(
        {
          codigo: '01-01',
          descripcion: 'VIBRADOR DE CONCRETO',
          modelo: 'S/M',
          numeroSerie: 'SN-123',
        },
        { includeCode: true, includeSerial: true },
      ),
    ).toBe('[01-01] VIBRADOR DE CONCRETO (S/N: SN-123)');
  });
});
