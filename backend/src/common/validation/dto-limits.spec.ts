import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LIMITS } from './dto-limits';
import { CreateEquipmentDto } from '../../modules/inventory/dto/create-equipment.dto';
import { CreateQuotationDto } from '../../modules/quotations/dto/create-quotation.dto';
import { CreatePublicQuotationDto } from '../../modules/quotations/dto/create-public-quotation.dto';
import { CreateDirectContractDto } from '../../modules/contracts/dto/create-contract.dto';
import { CreateCorteDto } from '../../modules/contracts/dto/create-corte.dto';
import {
  CreateRetornoDto,
  CreateDespachoDto,
  CreateSolicitudRetornoDto,
} from '../../modules/operations/dto/create-operations.dto';
import { CreateLecturaHorometroDto } from '../../modules/horometros/dto/create-lectura.dto';
import { CreateClientDto } from '../../modules/clients/dto/create-client.dto';
import { LoginDto } from '../../modules/auth/dto/login.dto';

const UUID = '3f2b8c1e-9d4a-4b6e-8a1f-2c7d5e9b0a11';

async function errores(cls: any, plain: any): Promise<string[]> {
  const dto = plainToInstance(cls, plain);
  const res = await validate(dto as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const flat = (e: any, p = ''): string[] =>
    e.flatMap((x: any) => [
      ...(x.constraints ? [`${p}${x.property}`] : []),
      ...flat(x.children || [], `${p}${x.property}.`),
    ]);
  return flat(res).map((p) => p.replace(/\.\d+\./g, '.'));
}

const equipoValido = {
  modelo: 'CAT 320',
  categoriaId: UUID,
  marcaId: UUID,
  sucursalId: UUID,
  precioRentaDia: 1500.5,
};

describe('Límites de DTOs (montos, cantidades, textos, enums, fechas)', () => {
  describe('Equipo', () => {
    it('acepta un payload válido', async () => {
      expect(await errores(CreateEquipmentDto, equipoValido)).toEqual([]);
    });
    it.each([
      ['precio negativo', { precioRentaDia: -1 }, 'precioRentaDia'],
      [
        'precio sobre el máximo',
        { precioRentaDia: LIMITS.UNIT_PRICE_MAX + 1 },
        'precioRentaDia',
      ],
      [
        'precio con 5 decimales',
        { precioRentaDia: 10.12345 },
        'precioRentaDia',
      ],
      ['stock fraccionario', { cantidadTotal: 1.5 }, 'cantidadTotal'],
      ['stock negativo', { cantidadDisponible: -3 }, 'cantidadDisponible'],
      ['horómetro negativo', { horometro: -0.5 }, 'horometro'],
      ['costo > máximo', { costoAdquisicion: 1e12 }, 'costoAdquisicion'],
      [
        'modelo demasiado largo',
        { modelo: 'x'.repeat(LIMITS.TEXT.SHORT + 1) },
        'modelo',
      ],
      [
        'fecha imposible',
        { fechaAdquisicion: '2026-02-30' },
        'fechaAdquisicion',
      ],
      [
        'descripción enorme',
        { descripcion: 'x'.repeat(LIMITS.TEXT.NOTES + 1) },
        'descripcion',
      ],
    ])('rechaza %s', async (_n, parcial, campo) => {
      expect(
        await errores(CreateEquipmentDto, { ...equipoValido, ...parcial }),
      ).toContain(campo);
    });
    it('acepta fecha de adquisición válida (solo fecha y ISO completo)', async () => {
      expect(
        await errores(CreateEquipmentDto, {
          ...equipoValido,
          fechaAdquisicion: '2026-10-01',
        }),
      ).toEqual([]);
      expect(
        await errores(CreateEquipmentDto, {
          ...equipoValido,
          fechaAdquisicion: '2026-10-01T10:00:00.000Z',
        }),
      ).toEqual([]);
    });
  });

  describe('Cotización', () => {
    const item = {
      descripcion: 'Retroexcavadora',
      cantidad: 1,
      dias: 3,
      tipoTarifa: 'DIA',
      precioUnitario: 100,
    };
    const base = { clienteId: UUID, items: [item] };

    it('acepta payload válido y no exige decimales en importes calculados por el cliente', async () => {
      expect(await errores(CreateQuotationDto, base)).toEqual([]);
      // 0.1 * 3 = 0.30000000000000004: el servidor recalcula, no debe fallar por ruido de coma flotante
      expect(
        await errores(CreateQuotationDto, {
          ...base,
          subtotal: 0.30000000000000004,
          iva: 0.045000000000000005,
          total: 0.34500000000000003,
        }),
      ).toEqual([]);
    });
    it.each([
      [
        'tipoTarifa inválido',
        { items: [{ ...item, tipoTarifa: 'SEMANA' }] },
        'items.tipoTarifa',
      ],
      [
        'cantidad fraccionaria',
        { items: [{ ...item, cantidad: 1.5 }] },
        'items.cantidad',
      ],
      [
        'días fuera de rango',
        { items: [{ ...item, dias: 99999 }] },
        'items.dias',
      ],
      [
        'precio negativo',
        { items: [{ ...item, precioUnitario: -5 }] },
        'items.precioUnitario',
      ],
      [
        'más de 200 ítems',
        { items: Array.from({ length: LIMITS.ITEMS_MAX + 1 }, () => item) },
        'items',
      ],
      ['total sobre el máximo', { total: LIMITS.MONEY_MAX + 1 }, 'total'],
      ['validez > 365', { validezDias: 366 }, 'validezDias'],
      [
        'condiciones enormes',
        { condiciones: 'x'.repeat(LIMITS.TEXT.NOTES + 1) },
        'condiciones',
      ],
      [
        'depósito con 3 decimales',
        { depositoGarantia: 10.123 },
        'depositoGarantia',
      ],
    ])('rechaza %s', async (_n, parcial, campo) => {
      expect(
        await errores(CreateQuotationDto, { ...base, ...parcial }),
      ).toContain(campo);
    });
    it('cotización pública: ids y textos acotados', async () => {
      const ok = {
        email: 'a@b.com',
        atencion: 'Juan',
        items: [{ cantidad: 1, tipoTarifa: 'HORA', horas: 4 }],
      };
      expect(await errores(CreatePublicQuotationDto, ok)).toEqual([]);
      expect(
        await errores(CreatePublicQuotationDto, {
          ...ok,
          empresaId: 'x'.repeat(65),
        }),
      ).toContain('empresaId');
      expect(
        await errores(CreatePublicQuotationDto, {
          ...ok,
          atencion: 'x'.repeat(201),
        }),
      ).toContain('atencion');
    });
  });

  describe('Contratos y cortes', () => {
    const base = {
      clienteId: UUID,
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-31',
      items: [
        {
          equipoId: UUID,
          cantidad: 1,
          dias: 30,
          precioRenta: 100,
          tipoTarifa: 'DIA',
          tipoCobro: 'POR_DIA',
        },
      ],
    };
    it('acepta payload válido', async () => {
      expect(await errores(CreateDirectContractDto, base)).toEqual([]);
    });
    it.each([
      ['periodoDiasCorte 0', { periodoDiasCorte: 0 }, 'periodoDiasCorte'],
      [
        'periodoDiasCorte fraccionario',
        { periodoDiasCorte: 7.5 },
        'periodoDiasCorte',
      ],
      ['depósito negativo', { depositoGarantia: -1 }, 'depositoGarantia'],
      ['fecha imposible', { fechaFin: '2026-02-30' }, 'fechaFin'],
      [
        'tipoCobro inválido',
        { items: [{ ...base.items[0], tipoCobro: 'MENSUAL' }] },
        'items.tipoCobro',
      ],
    ])('rechaza %s', async (_n, parcial, campo) => {
      expect(
        await errores(CreateDirectContractDto, { ...base, ...parcial }),
      ).toContain(campo);
    });
    it('corte: monto negativo o numeroCorte 0 son inválidos', async () => {
      const ok = {
        contratoId: UUID,
        numeroCorte: 1,
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-15',
        monto: 100,
      };
      expect(await errores(CreateCorteDto, ok)).toEqual([]);
      expect(await errores(CreateCorteDto, { ...ok, monto: -1 })).toContain(
        'monto',
      );
      expect(
        await errores(CreateCorteDto, { ...ok, numeroCorte: 0 }),
      ).toContain('numeroCorte');
    });
  });

  describe('Operaciones', () => {
    const inspeccion = {
      funcionamiento: 'FUNCIONA',
      estadoFisico: 'BUENO',
      accesoriosCompletos: true,
    };
    const retorno = {
      contratoId: UUID,
      recibidoPor: 'Ana',
      items: [
        {
          equipoId: UUID,
          cantidadRetornada: 1,
          horometroFinal: 120.5,
          inspeccionEstado: inspeccion,
        },
      ],
    };
    it('retorno válido', async () => {
      expect(await errores(CreateRetornoDto, retorno)).toEqual([]);
    });
    it.each([
      [
        'cantidad negativa',
        { cantidadRetornada: -1 },
        'items.cantidadRetornada',
      ],
      [
        'cantidad fraccionaria',
        { cantidadPerdida: 0.5 },
        'items.cantidadPerdida',
      ],
      ['horómetro negativo', { horometroFinal: -1 }, 'items.horometroFinal'],
      [
        'cargo combustible negativo',
        { cargoCombustible: -10 },
        'items.cargoCombustible',
      ],
      [
        'descripción de daños enorme',
        { descripcionDanios: 'x'.repeat(2001) },
        'items.descripcionDanios',
      ],
    ])('retorno rechaza %s', async (_n, parcial, campo) => {
      const dto = { ...retorno, items: [{ ...retorno.items[0], ...parcial }] };
      expect(await errores(CreateRetornoDto, dto)).toContain(campo);
    });
    it('despacho: estadoSalida solo BUENO/REGULAR/DANADO y cantidad >= 1', async () => {
      const ok = {
        contratoId: UUID,
        items: [{ equipoId: UUID, cantidad: 1, estadoSalida: 'BUENO' }],
      };
      expect(await errores(CreateDespachoDto, ok)).toEqual([]);
      expect(
        await errores(CreateDespachoDto, {
          ...ok,
          items: [{ ...ok.items[0], estadoSalida: 'PERFECTO' }],
        }),
      ).toContain('items.estadoSalida');
      expect(
        await errores(CreateDespachoDto, {
          ...ok,
          items: [{ ...ok.items[0], cantidad: 0 }],
        }),
      ).toContain('items.cantidad');
    });
    it('solicitud de retorno: fecha imposible rechazada', async () => {
      const ok = { contratoId: UUID, fechaProgramada: '2026-11-01T10:00:00Z' };
      expect(await errores(CreateSolicitudRetornoDto, ok)).toEqual([]);
      expect(
        await errores(CreateSolicitudRetornoDto, {
          ...ok,
          fechaProgramada: '2026-02-30T10:00:00Z',
        }),
      ).toContain('fechaProgramada');
    });
  });

  describe('Otros', () => {
    it('lectura de horómetro: negativo o enorme rechazado', async () => {
      const ok = { equipoId: UUID, horometroNuevo: 10 };
      expect(await errores(CreateLecturaHorometroDto, ok)).toEqual([]);
      expect(
        await errores(CreateLecturaHorometroDto, { ...ok, horometroNuevo: -1 }),
      ).toContain('horometroNuevo');
      expect(
        await errores(CreateLecturaHorometroDto, {
          ...ok,
          horometroNuevo: 1e9,
        }),
      ).toContain('horometroNuevo');
    });
    it('cliente: límite de crédito y textos acotados', async () => {
      const ok = { nombre: 'ACME' };
      expect(await errores(CreateClientDto, ok)).toEqual([]);
      expect(
        await errores(CreateClientDto, { ...ok, limiteCredito: -5 }),
      ).toContain('limiteCredito');
      expect(
        await errores(CreateClientDto, { ...ok, nombre: 'x'.repeat(201) }),
      ).toContain('nombre');
      expect(
        await errores(CreateClientDto, { ...ok, direccion: 'x'.repeat(301) }),
      ).toContain('direccion');
    });
    it('login: password y email acotados', async () => {
      expect(
        await errores(LoginDto, { email: 'a@b.com', password: 'secreto1' }),
      ).toEqual([]);
      expect(
        await errores(LoginDto, {
          email: 'a@b.com',
          password: 'x'.repeat(129),
        }),
      ).toContain('password');
    });
  });
});
