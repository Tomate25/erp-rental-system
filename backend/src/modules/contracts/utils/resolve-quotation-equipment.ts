import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertSucursalEnEmpresa } from '../../../common/utils/tenant.util';
import {
  DecimalLike,
  positiveHorasOr,
  toNumberHoras,
} from '../../../common/utils/decimal.util';

type QuotationEquipmentItem = {
  equipoId?: string | null;
  descripcion: string;
  precioUnitario: number | Prisma.Decimal;
  cantidad: number;
  tipoCobro?: string | null;
  tipoTarifa?: string | null;
  dias?: DecimalLike;
  horas?: DecimalLike;
  nivelPrecio?: any;
};

// Resolve only explicit inventory references; quotation line IDs are never equipment IDs.
export async function resolveQuotationEquipment(
  tx: Prisma.TransactionClient,
  items: QuotationEquipmentItem[],
  empresaId: string,
  sucursalId: string | null | undefined,
): Promise<Prisma.DetalleContratoCreateWithoutContratoInput[]> {
  let effectiveSucursalId = sucursalId;
  if (effectiveSucursalId) {
    // Una sucursal recibida (cotizacion/body) debe pertenecer a la empresa del contrato.
    await assertSucursalEnEmpresa(tx, effectiveSucursalId, empresaId);
  } else if (tx.sucursal) {
    const defaultBranch = await tx.sucursal.findFirst({
      where: { empresaId },
      orderBy: { createdAt: 'asc' },
    });
    effectiveSucursalId = defaultBranch?.id;
  }

  if (!empresaId || !effectiveSucursalId) {
    throw new BadRequestException(
      'Debe asignar empresa y sucursal a la cotización antes de generar el contrato.',
    );
  }

  for (const item of items) {
    if (!item.equipoId) {
      throw new BadRequestException(
        `Debe asignar un equipo físico al ítem "${item.descripcion}" antes de generar el contrato.`,
      );
    }
  }

  const equipos = await tx.equipo.findMany({
    where: {
      id: { in: [...new Set(items.map((item) => item.equipoId!))] },
      empresaId,
    },
    select: { id: true, tipoControl: true, horometro: true },
  });
  const equiposById = new Map(equipos.map((equipo) => [equipo.id, equipo]));

  return items.map((item) => {
    const equipo = equiposById.get(item.equipoId!);
    if (!equipo) {
      throw new BadRequestException(
        `El equipo asignado al ítem "${item.descripcion}" no existe en la empresa del contrato.`,
      );
    }

    return {
      equipo: { connect: { id: equipo.id } },
      precioRenta: item.precioUnitario,
      cantidad: item.cantidad,
      tipoTarifa:
        item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA'
          ? 'HORA'
          : 'DIA',
      dias: item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA'
        ? toNumberHoras(item.horas ?? item.dias, 1)
        : positiveHorasOr(item.dias, 1),
      horasPactadas: item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA'
        ? toNumberHoras(item.horas ?? item.dias, 1)
        : null,
      ...(item.nivelPrecio ? { nivelPrecio: item.nivelPrecio } : {}),
      tipoControl: equipo.tipoControl,
      horometroInicial: equipo.horometro,
    };
  });
}
