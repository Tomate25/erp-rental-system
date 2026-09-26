import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type QuotationEquipmentItem = {
  equipoId?: string | null;
  descripcion: string;
  precioUnitario: number | Prisma.Decimal;
  cantidad: number;
  tipoCobro?: string | null;
  tipoTarifa?: string | null;
  dias?: number | null;
  horas?: number | null;
};

// Resolve only explicit inventory references; quotation line IDs are never equipment IDs.
export async function resolveQuotationEquipment(
  tx: Prisma.TransactionClient,
  items: QuotationEquipmentItem[],
  empresaId: string,
  sucursalId: string | null | undefined,
): Promise<Prisma.DetalleContratoCreateWithoutContratoInput[]> {
  let effectiveSucursalId = sucursalId;
  if (!effectiveSucursalId && tx.sucursal) {
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
        ? item.horas ?? item.dias ?? 1
        : item.dias || 1,
      horasPactadas: item.tipoCobro === 'POR_HORA' || item.tipoTarifa === 'HORA'
        ? item.horas ?? item.dias ?? 1
        : null,
      tipoControl: equipo.tipoControl,
      horometroInicial: equipo.horometro,
    };
  });
}
