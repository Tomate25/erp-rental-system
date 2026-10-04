type ItemDespachado = { cantidad: number };
type ItemDevuelto = {
  cantidadRetornada?: number | null;
  cantidadPerdida?: number | null;
};

export interface BalanceRetorno {
  totalDespachado: number;
  /** Unidades que ya no están en alquiler: retornadas + declaradas perdidas. */
  totalRetornado: number;
  pendiente: number;
}

/**
 * Balance despachado vs. retornado de un contrato. Una unidad perdida deja de
 * estar en poder del cliente al firmarse la recepción (su cargo patrimonial se
 * gestiona aparte), igual que en OperationsService.
 */
export function calcularBalanceRetorno(
  despachos: Array<{ items?: ItemDespachado[] | null }> | null | undefined,
  devoluciones: Array<{ items?: ItemDevuelto[] | null }> | null | undefined,
): BalanceRetorno {
  const totalDespachado = (despachos || []).reduce(
    (sum, d) =>
      sum + (d.items || []).reduce((acc, i) => acc + Number(i.cantidad || 0), 0),
    0,
  );
  const totalRetornado = (devoluciones || []).reduce(
    (sum, dev) =>
      sum +
      (dev.items || []).reduce(
        (acc, i) =>
          acc +
          Number(i.cantidadRetornada || 0) +
          Number(i.cantidadPerdida || 0),
        0,
      ),
    0,
  );
  return {
    totalDespachado,
    totalRetornado,
    pendiente: Math.max(0, totalDespachado - totalRetornado),
  };
}