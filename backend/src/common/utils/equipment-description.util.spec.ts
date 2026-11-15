import { formatEquipmentFullName } from './equipment-description.util';

describe('formatEquipmentFullName', () => {
  it('combina descripcion y modelo para mostrar el nombre completo del producto', () => {
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
  });

  it('no duplica el modelo si ya forma parte de descripcion u omite S/M', () => {
    expect(
      formatEquipmentFullName({
        descripcion: 'COMPACTADORA BAILARINA WACKER BS60-4',
        modelo: 'WACKER BS60-4',
      }),
    ).toBe('COMPACTADORA BAILARINA WACKER BS60-4');

    expect(
      formatEquipmentFullName({
        descripcion: 'MEZCLADORA 1 SACO',
        modelo: 'S/M',
      }),
    ).toBe('MEZCLADORA 1 SACO');
  });
});
