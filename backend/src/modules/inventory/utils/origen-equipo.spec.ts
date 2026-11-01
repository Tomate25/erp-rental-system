import { BadRequestException } from '@nestjs/common';
import { OrigenEquipo } from '@prisma/client';
import {
  assertPromovibleParaRenta,
  resolveOrigenEquipo,
} from './origen-equipo';

describe('resolveOrigenEquipo', () => {
  it('trata el alta sin origen como flota propia y limpia datos de proveedor', () => {
    expect(
      resolveOrigenEquipo({
        proveedorNombre: 'Alguien',
        precioProveedor: 100,
      }),
    ).toEqual({
      origenEquipo: OrigenEquipo.PROPIO,
      proveedorNombre: null,
      precioProveedor: null,
      disponibleParaRenta: true,
    });
  });

  it('exige proveedor y precio cuando el origen es PROVEEDOR', () => {
    expect(() =>
      resolveOrigenEquipo({ origenEquipo: OrigenEquipo.PROVEEDOR }),
    ).toThrow(BadRequestException);

    expect(() =>
      resolveOrigenEquipo({
        origenEquipo: OrigenEquipo.PROVEEDOR,
        proveedorNombre: '  Andamios del Norte  ',
      }),
    ).toThrow(/precio que cobra el proveedor/);

    expect(
      resolveOrigenEquipo({
        origenEquipo: OrigenEquipo.PROVEEDOR,
        proveedorNombre: '  Andamios del Norte  ',
        precioProveedor: 350.5,
        disponibleParaRenta: false,
      }),
    ).toEqual({
      origenEquipo: OrigenEquipo.PROVEEDOR,
      proveedorNombre: 'Andamios del Norte',
      precioProveedor: 350.5,
      disponibleParaRenta: false,
    });
  });

  it('en edición hereda proveedor y precio si no vienen en el cambio', () => {
    expect(
      resolveOrigenEquipo(
        { disponibleParaRenta: true },
        {
          origenEquipo: OrigenEquipo.PROVEEDOR,
          proveedorNombre: 'RentAll',
          precioProveedor: 80,
          disponibleParaRenta: false,
        },
      ),
    ).toEqual({
      origenEquipo: OrigenEquipo.PROVEEDOR,
      proveedorNombre: 'RentAll',
      precioProveedor: 80,
      disponibleParaRenta: true,
    });
  });

  it('al pasar a propio borra el vínculo con el proveedor', () => {
    expect(
      resolveOrigenEquipo(
        { origenEquipo: OrigenEquipo.PROPIO },
        {
          origenEquipo: OrigenEquipo.PROVEEDOR,
          proveedorNombre: 'RentAll',
          precioProveedor: 80,
          disponibleParaRenta: true,
        },
      ),
    ).toEqual({
      origenEquipo: OrigenEquipo.PROPIO,
      proveedorNombre: null,
      precioProveedor: null,
      disponibleParaRenta: true,
    });
  });
});

describe('assertPromovibleParaRenta', () => {
  it('permite equipos sin el flag o con el flag activo', () => {
    expect(() => assertPromovibleParaRenta({ modelo: 'Andamio' })).not.toThrow();
    expect(() =>
      assertPromovibleParaRenta({ modelo: 'Andamio', disponibleParaRenta: true }),
    ).not.toThrow();
  });

  it('rechaza el equipo que no se puede promover', () => {
    expect(() =>
      assertPromovibleParaRenta({
        descripcion: 'Torre 6 m',
        disponibleParaRenta: false,
      }),
    ).toThrow(/Torre 6 m/);
  });
});
