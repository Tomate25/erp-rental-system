import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrigenEquipo } from '@prisma/client';
import { CreateEquipmentDto } from './create-equipment.dto';
import { UpdateEquipmentDto } from './update-equipment.dto';

const UUID = '3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a11';

async function errores(cls: new () => object, plain: object): Promise<string[]> {
  const dto = plainToInstance(cls, plain);
  const res = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return res.map((e) => e.property);
}

const alta = {
  modelo: 'Andamio marco',
  categoriaId: UUID,
  marcaId: UUID,
  sucursalId: UUID,
  precioRentaDia: 150,
};

describe('DTO de equipo: origen proveedor', () => {
  it('acepta alta propia sin campos de proveedor y conserva costo de adquisición', async () => {
    expect(
      await errores(CreateEquipmentDto, {
        ...alta,
        origenEquipo: OrigenEquipo.PROPIO,
        costoAdquisicion: 1200,
      }),
    ).toEqual([]);
  });

  it('acepta alta de proveedor con nombre, precio y disponible para renta', async () => {
    expect(
      await errores(CreateEquipmentDto, {
        ...alta,
        origenEquipo: OrigenEquipo.PROVEEDOR,
        proveedorNombre: 'Andamios del Norte',
        precioProveedor: 420.5,
        disponibleParaRenta: true,
      }),
    ).toEqual([]);
  });

  it('acepta limpiar proveedor en edición sin tocar el costo', async () => {
    expect(
      await errores(UpdateEquipmentDto, {
        origenEquipo: OrigenEquipo.PROPIO,
        proveedorNombre: null,
        precioProveedor: null,
        disponibleParaRenta: true,
      }),
    ).toEqual([]);
  });

  it('rechaza origen desconocido, precio negativo y un flag que no es booleano', async () => {
    expect(
      await errores(CreateEquipmentDto, { ...alta, origenEquipo: 'ALQUILER' }),
    ).toContain('origenEquipo');
    expect(
      await errores(CreateEquipmentDto, {
        ...alta,
        origenEquipo: OrigenEquipo.PROVEEDOR,
        proveedorNombre: 'RentAll',
        precioProveedor: -1,
      }),
    ).toContain('precioProveedor');
    expect(
      await errores(UpdateEquipmentDto, { disponibleParaRenta: 'si' }),
    ).toContain('disponibleParaRenta');
  });
});
