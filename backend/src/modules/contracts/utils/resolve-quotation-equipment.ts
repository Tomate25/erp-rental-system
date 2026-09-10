import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type QuotationEquipmentItem = {
  equipoId?: string | null;
  descripcion: string;
  precioUnitario: number;
  cantidad: number;
  tipoCobro?: string | null;
  tipoTarifa?: string | null;
  dias?: number | null;
};

// Resolve only explicit inventory references; quotation line IDs are never equipment IDs.
export async function resolveQuotationEquipment(
  tx: Prisma.TransactionClient,
  items: QuotationEquipmentItem[],
  empresaId: string,
  sucursalId: string | null | undefined,
): Promise<Prisma.DetalleContratoCreateWithoutContratoInput[]> {
  if (!empresaId || !sucursalId) {
    throw new BadRequestException('Debe asignar empresa y sucursal a la cotización antes de generar el contrato.');
  }

  for (const item of items) {
    if (!item.equipoId) {
      throw new BadRequestException(`Debe asignar un equipo físico al ítem "${item.descripcion}" antes de generar el contrato.`);
    }
  }

  const equipos = await tx.equipo.findMany({
    where: {
      id: { in: [...new Set(items.map(item => item.equipoId!))] },
      empresaId,
      sucursalId,
    },
    select: { id: true, tipoControl: true, horometro: true },
  });
  const equiposById = new Map(equipos.map(equipo => [equipo.id, equipo]));

  return items.map(item => {
    const equipo = equiposById.get(item.equipoId!);
    if (!equipo) {
      throw new BadRequestException(`El equipo asignado al ítem "${item.descripcion}" no existe en la empresa y sucursal del contrato.`);
    }

    return {
      equipo: { connect: { id: equipo.id } },
      precioRenta: item.precioUnitario,
      cantidad: item.cantidad,
      tipoTarifa: (item as any).tipoCobro === 'POR_HORA' || (item as any).tipoTarifa === 'HORA' ? 'HORA' : 'DIA',
      dias: (item as any).dias || 1,
      tipoControl: equipo.tipoControl,
      horometroInicial: equipo.horometro,
    };
  });
}
