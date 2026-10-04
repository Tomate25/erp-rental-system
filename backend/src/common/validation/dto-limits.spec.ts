import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LIMITS } from './dto-limits';
import { CreateEquipmentDto } from '../../modules/inventory/dto/create-equipment.dto';
import { CreateQuotationDto } from '../../modules/quotations/dto/create-quotation.dto';
import { CreatePublicQuotationDto } from '../../modules/quotations/dto/create-public-quotation.dto';
import { UpdateQuotationDto } from '../../modules/quotations/dto/update-quotation.dto';
import { MSG_HORAS_DIA } from './dias-horas.validator';
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

/** Mensajes de error de un campo concreto (p. ej. 'items.dias'), con la ruta sin indices. */
async function mensajes(cls: any, plain: any, campo: string): Promise<string[]> {
  const dto = plainToInstance(cls, plain);
  const res = await validate(dto as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const out: string[] = [];
  const walk = (e: any[], p = '') =>
    e.forEach((x) => {
      const ruta = `${p}${x.property}`.replace(/\.\d+\./g, '.');
      if (x.constraints && ruta === campo) out.push(...Object.values<string>(x.constraints));
      walk(x.children || [], `${p}${x.property}.`);
    });
  walk(res);
  return out;
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

  describe('dias/horas condicionales por tipoTarifa', () => {
    const MSG_DIAS_DIA = 'dias debe ser un entero entre 1 y 3650 para tarifa DIA.';
    const MSG_DIAS_HORA =
      'dias debe estar entre 0,01 y 87600 horas, con máximo 2 decimales, para tarifa HORA.';
    const MSG_HORAS_HORA =
      'horas debe estar entre 0,01 y 87600 horas, con máximo 2 decimales, para tarifa HORA.';

    const cotizacion = (item: any) => ({
      clienteId: UUID,
      items: [{ descripcion: 'Equipo', cantidad: 1, precioUnitario: 100, ...item }],
    });
    const contrato = (item: any) => ({
      clienteId: UUID,
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-31',
      items: [{ equipoId: UUID, cantidad: 1, precioRenta: 100, ...item }],
    });
    const publica = (item: any) => ({
      email: 'a@b.com',
      atencion: 'Juan',
      items: [{ cantidad: 1, ...item }],
    });

    describe('tarifa DIA: dias entero 1-3650', () => {
      it.each([
        ['7.5 (decimal)', 7.5],
        ['3651 (sobre el maximo)', 3651],
        ['0', 0],
        ['-1', -1],
        ['"3" (texto)', '3'],
      ])('cotizacion rechaza dias %s con el mensaje exacto', async (_n, dias) => {
        expect(
          await mensajes(CreateQuotationDto, cotizacion({ tipoTarifa: 'DIA', dias }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
      });

      it.each([1, 3, 3650])('cotizacion acepta dias %s', async (dias) => {
        expect(
          await errores(CreateQuotationDto, cotizacion({ tipoTarifa: 'DIA', dias })),
        ).toEqual([]);
      });

      it('sin tipoTarifa ni tipoCobro se trata como DIA', async () => {
        expect(
          await mensajes(CreateQuotationDto, cotizacion({ dias: 7.5 }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
      });

      it('dias sigue siendo obligatorio en la cotizacion', async () => {
        expect(
          await mensajes(CreateQuotationDto, cotizacion({ tipoTarifa: 'DIA' }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
      });

      it('contrato y cotizacion publica aplican la misma regla', async () => {
        expect(
          await mensajes(CreateDirectContractDto, contrato({ tipoTarifa: 'DIA', dias: 7.5 }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
        expect(
          await mensajes(CreateDirectContractDto, contrato({ tipoTarifa: 'DIA', dias: 3651 }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
        expect(
          await mensajes(CreatePublicQuotationDto, publica({ tipoTarifa: 'DIA', dias: 1.5 }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
        // dias es opcional en contrato directo y en cotizacion publica
        expect(await errores(CreateDirectContractDto, contrato({ tipoTarifa: 'DIA' }))).toEqual([]);
        expect(await errores(CreatePublicQuotationDto, publica({ tipoTarifa: 'DIA' }))).toEqual([]);
      });

      it('horas es opcional y se ignora al validar una linea por dia', async () => {
        expect(
          await errores(CreateQuotationDto, cotizacion({ tipoTarifa: 'DIA', dias: 3 })),
        ).toEqual([]);
        expect(
          await errores(CreateQuotationDto, cotizacion({ tipoTarifa: 'DIA', dias: 3, horas: 7.5 })),
        ).toEqual([]);
        expect(
          await mensajes(
            CreateQuotationDto,
            cotizacion({ tipoTarifa: 'DIA', dias: 3, horas: 87601 }),
            'items.horas',
          ),
        ).toEqual(['horas debe estar entre 0 y 87600 horas, con máximo 2 decimales.']);
      });
    });

    describe('tarifa HORA: dias y horas decimales 0,01-87600 con maximo 2 decimales', () => {
      it.each([
        ['87600.01 (sobre el maximo)', 87600.01],
        ['1.001 (3 decimales)', 1.001],
        ['6.505 (3 decimales)', 6.505],
        ['0', 0],
        ['0.001', 0.001],
        ['-5', -5],
        ['"6.5" (texto)', '6.5'],
      ])('cotizacion rechaza dias %s con el mensaje exacto', async (_n, dias) => {
        expect(
          await mensajes(CreateQuotationDto, cotizacion({ tipoTarifa: 'HORA', dias }), 'items.dias'),
        ).toEqual([MSG_DIAS_HORA]);
      });

      it.each([6.5, 24, 152, 0.01, 4000, 87600, 21.900000000000002])(
        'cotizacion acepta dias %s (incluye >3650 y ruido de coma flotante)',
        async (dias) => {
          expect(
            await errores(CreateQuotationDto, cotizacion({ tipoTarifa: 'HORA', dias })),
          ).toEqual([]);
        },
      );

      it('tipoCobro POR_HORA sin tipoTarifa tambien es horario (criterio de los servicios)', async () => {
        expect(
          await errores(CreateQuotationDto, cotizacion({ tipoCobro: 'POR_HORA', dias: 19.5, horas: 19.5 })),
        ).toEqual([]);
        expect(
          await mensajes(CreateQuotationDto, cotizacion({ tipoCobro: 'POR_HORA', dias: 87600.01 }), 'items.dias'),
        ).toEqual([MSG_DIAS_HORA]);
      });

      it.each([
        ['87600.01', 87600.01],
        ['6.505 (3 decimales)', 6.505],
        ['0', 0],
        ['"8" (texto)', '8'],
      ])('horas rechaza %s con el mensaje exacto', async (_n, horas) => {
        expect(
          await mensajes(
            CreateQuotationDto,
            cotizacion({ tipoTarifa: 'HORA', dias: 8, horas }),
            'items.horas',
          ),
        ).toEqual([MSG_HORAS_HORA]);
      });

      it.each([6.5, 24, 152, 87600])('horas acepta %s', async (horas) => {
        expect(
          await errores(CreateQuotationDto, cotizacion({ tipoTarifa: 'HORA', dias: horas, horas })),
        ).toEqual([]);
      });

      it('contrato: dias/horas decimales y >3650 aceptados; 3 decimales y >87600 rechazados', async () => {
        for (const v of [6.5, 24, 152, 19.5, 4000]) {
          expect(
            await errores(CreateDirectContractDto, contrato({ tipoTarifa: 'HORA', dias: v, horas: v })),
          ).toEqual([]);
        }
        expect(
          await mensajes(CreateDirectContractDto, contrato({ tipoTarifa: 'HORA', dias: 1.234 }), 'items.dias'),
        ).toEqual([MSG_DIAS_HORA]);
        expect(
          await mensajes(CreateDirectContractDto, contrato({ tipoTarifa: 'HORA', horas: 87600.01 }), 'items.horas'),
        ).toEqual([MSG_HORAS_HORA]);
      });

      it('cotizacion publica: acepta horas decimales y rechaza 3 decimales', async () => {
        expect(
          await errores(CreatePublicQuotationDto, publica({ tipoTarifa: 'HORA', dias: 152.5, horas: 6.5 })),
        ).toEqual([]);
        expect(
          await mensajes(CreatePublicQuotationDto, publica({ tipoTarifa: 'HORA', horas: 1.001 }), 'items.horas'),
        ).toEqual([MSG_HORAS_HORA]);
      });
    });

    describe('UpdateQuotationDto (actualizacion): mismas reglas por tarifa que la creacion', () => {
      const actualizacion = (item: any) => ({
        items: [{ descripcion: 'Equipo', cantidad: 1, precioUnitario: 100, ...item }],
      });

      it('una actualizacion sin items (o con otros campos) sigue siendo valida', async () => {
        expect(await errores(UpdateQuotationDto, {})).toEqual([]);
        expect(await errores(UpdateQuotationDto, { proyecto: 'Obra', validezDias: 30 })).toEqual([]);
      });

      it.each([
        ['7.5 (decimal)', 7.5],
        ['3651 (sobre el maximo)', 3651],
        ['0', 0],
        ['-1', -1],
        ['"3" (texto)', '3'],
      ])('tarifa DIA rechaza dias %s con el mensaje exacto', async (_n, dias) => {
        expect(
          await mensajes(UpdateQuotationDto, actualizacion({ tipoTarifa: 'DIA', dias }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
      });

      it.each([1, 3, 3650])('tarifa DIA acepta dias %s', async (dias) => {
        expect(
          await errores(UpdateQuotationDto, actualizacion({ tipoTarifa: 'DIA', dias })),
        ).toEqual([]);
      });

      it('sin tipoTarifa ni tipoCobro se trata como DIA y dias es obligatorio en cada linea', async () => {
        expect(
          await mensajes(UpdateQuotationDto, actualizacion({ dias: 7.5 }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
        expect(
          await mensajes(UpdateQuotationDto, actualizacion({ tipoTarifa: 'DIA' }), 'items.dias'),
        ).toEqual([MSG_DIAS_DIA]);
      });

      it.each([
        ['87600.01 (sobre el maximo)', 87600.01],
        ['1.001 (3 decimales)', 1.001],
        ['6.505 (3 decimales)', 6.505],
        ['0', 0],
        ['0.001', 0.001],
        ['-5', -5],
        ['"6.5" (texto)', '6.5'],
      ])('tarifa HORA rechaza dias %s con el mensaje exacto', async (_n, dias) => {
        expect(
          await mensajes(UpdateQuotationDto, actualizacion({ tipoTarifa: 'HORA', dias }), 'items.dias'),
        ).toEqual([MSG_DIAS_HORA]);
      });

      it.each([6.5, 24, 152, 0.01, 4000, 87600, 21.900000000000002])(
        'tarifa HORA acepta dias %s (incluye >3650 y ruido de coma flotante)',
        async (dias) => {
          expect(
            await errores(UpdateQuotationDto, actualizacion({ tipoTarifa: 'HORA', dias })),
          ).toEqual([]);
        },
      );

      it('tipoCobro POR_HORA sin tipoTarifa tambien es horario', async () => {
        expect(
          await errores(UpdateQuotationDto, actualizacion({ tipoCobro: 'POR_HORA', dias: 19.5, horas: 19.5 })),
        ).toEqual([]);
        expect(
          await mensajes(UpdateQuotationDto, actualizacion({ tipoCobro: 'POR_HORA', dias: 87600.01 }), 'items.dias'),
        ).toEqual([MSG_DIAS_HORA]);
      });

      it.each([
        ['87600.01', 87600.01],
        ['6.505 (3 decimales)', 6.505],
        ['0', 0],
        ['"8" (texto)', '8'],
      ])('tarifa HORA: horas rechaza %s con el mensaje exacto', async (_n, horas) => {
        expect(
          await mensajes(
            UpdateQuotationDto,
            actualizacion({ tipoTarifa: 'HORA', dias: 8, horas }),
            'items.horas',
          ),
        ).toEqual([MSG_HORAS_HORA]);
      });

      it.each([6.5, 24, 152, 87600])('tarifa HORA: horas acepta %s', async (horas) => {
        expect(
          await errores(UpdateQuotationDto, actualizacion({ tipoTarifa: 'HORA', dias: horas, horas })),
        ).toEqual([]);
      });

      it('tarifa DIA: horas es opcional y, si viene, 0-87600 con 2 decimales (mensaje exacto)', async () => {
        expect(
          await errores(UpdateQuotationDto, actualizacion({ tipoTarifa: 'DIA', dias: 3, horas: 7.5 })),
        ).toEqual([]);
        expect(
          await mensajes(
            UpdateQuotationDto,
            actualizacion({ tipoTarifa: 'DIA', dias: 3, horas: 87601 }),
            'items.horas',
          ),
        ).toEqual([MSG_HORAS_DIA]);
      });

      it('tipoTarifa fuera de DIA/HORA se rechaza', async () => {
        expect(
          await errores(UpdateQuotationDto, actualizacion({ tipoTarifa: 'MES', dias: 3 })),
        ).toContain('items.tipoTarifa');
      });

      it('actualizacion y creacion producen exactamente los mismos mensajes por linea', async () => {
        for (const item of [
          { tipoTarifa: 'DIA', dias: 7.5 },
          { tipoTarifa: 'HORA', dias: 6.505 },
          { tipoTarifa: 'HORA', dias: 8, horas: 87600.01 },
        ]) {
          for (const campo of ['items.dias', 'items.horas']) {
            expect(await mensajes(UpdateQuotationDto, actualizacion(item), campo)).toEqual(
              await mensajes(CreateQuotationDto, cotizacion(item), campo),
            );
          }
        }
      });
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
