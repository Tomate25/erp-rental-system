import type { Equipment } from '../types/inventory.types';
import {
  type GroupedProduct,
  type InventorySummary,
  type ProductUnitsResponse,
  type StatusCounts,
  type UnitState,
  calculateOccupancy,
} from '../types/grouped-inventory.types';

function mapLegacyStateToUnitState(estado: string): UnitState {
  switch (estado) {
    case 'DISPONIBLE':
      return 'DISPONIBLE';
    case 'DESPACHADO':
    case 'RENTADO':
    case 'RETORNO':
      return 'ALQUILADO';
    case 'RESERVADO':
      return 'RESERVADO';
    case 'EN_MANTENIMIENTO':
    case 'FUERA_DE_SERVICIO':
    case 'MANTENIMIENTO':
      return 'EN_REPARACION';
    case 'BAJA':
      return 'BAJA';
    default:
      return 'DISPONIBLE';
  }
}

/**
 * Transforma la lista plana de Equipment[] en productos agrupados y resumen KPI
 * para permitir visualización inmediata en frontend sin depender de cambios de API.
 */
export function buildGroupedDataFromEquipments(equipments: Equipment[]): {
  summary: InventorySummary;
  products: GroupedProduct[];
  unitsMap: Record<string, ProductUnitsResponse>;
} {
  const groupsMap = new Map<
    string,
    {
      productoId: string;
      nombre: string;
      familia: string;
      marca: string;
      tarifa: 'HORA' | 'DIA';
      tipoControl: 'SERIALIZADO' | 'POR_CANTIDAD';
      equipos: Equipment[];
    }
  >();

  const overallCounts: StatusCounts = {
    DISPONIBLE: 0,
    ALQUILADO: 0,
    RESERVADO: 0,
    EN_REPARACION: 0,
    BAJA: 0,
  };

  for (const eq of equipments) {
    const isAmarilla = Boolean(
      eq.isLineaAmarilla ||
      eq.modalidadRenta === 'SOLO_HORA' ||
      eq.categoria?.isLineaAmarilla ||
      (eq.codigo && eq.codigo.startsWith('08-'))
    );
    const tarifa: 'HORA' | 'DIA' = isAmarilla ? 'HORA' : 'DIA';
    const tipoControl: 'SERIALIZADO' | 'POR_CANTIDAD' =
      eq.tipoControl === 'POR_CANTIDAD' || (eq.cantidadTotal > 1 && !eq.numeroSerie)
        ? 'POR_CANTIDAD'
        : 'SERIALIZADO';

    const groupKey =
      eq.productoId ||
      eq.producto?.id ||
      `${eq.categoria?.nombre || 'General'}-${eq.modelo.trim().toUpperCase()}`;

    const nombre = eq.producto?.nombre || eq.modelo || 'Equipo sin nombre';
    const familia = eq.categoria?.nombre || (isAmarilla ? 'Maquinaria Amarilla' : 'Equipo General');
    const marca = eq.marca?.nombre || 'N/D';

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        productoId: groupKey,
        nombre,
        familia,
        marca,
        tarifa,
        tipoControl,
        equipos: [],
      });
    }

    groupsMap.get(groupKey)!.equipos.push(eq);
  }

  const products: GroupedProduct[] = [];
  const unitsMap: Record<string, ProductUnitsResponse> = {};

  for (const [id, grp] of groupsMap.entries()) {
    const groupCounts: StatusCounts = {
      DISPONIBLE: 0,
      ALQUILADO: 0,
      RESERVADO: 0,
      EN_REPARACION: 0,
      BAJA: 0,
    };

    let totalGroupUnits = 0;

    if (grp.tipoControl === 'SERIALIZADO') {
      const serialUnits = grp.equipos.map((eq) => {
        const state = mapLegacyStateToUnitState(eq.estado);
        const unitWeight = eq.cantidadTotal !== undefined ? eq.cantidadTotal : 1;
        if (unitWeight > 0) {
          groupCounts[state] += unitWeight;
          overallCounts[state] += unitWeight;
          totalGroupUnits += unitWeight;
        }

        return {
          id: eq.id,
          codigo: eq.codigo || 'S/C',
          marca: eq.marca?.nombre || grp.marca,
          modelo: eq.modelo,
          serie: eq.numeroSerie || 'S/N',
          estado: state,
          clienteAsignado: eq.estado === 'DESPACHADO' || eq.estado === 'RENTADO' ? 'Cliente Activo' : null,
          contratoNumero: null,
          fechaDevolucion: null,
          horometro: eq.horometro,
        };
      });

      unitsMap[id] = {
        tipoControl: 'SERIALIZADO',
        unidades: serialUnits,
      };
    } else {
      // Por cantidad
      for (const eq of grp.equipos) {
        const tot = eq.cantidadTotal !== undefined ? eq.cantidadTotal : 1;
        const disp = eq.cantidadDisponible !== undefined ? eq.cantidadDisponible : tot;
        const enUso = Math.max(0, tot - disp);

        groupCounts.DISPONIBLE += disp;
        groupCounts.ALQUILADO += enUso;
        overallCounts.DISPONIBLE += disp;
        overallCounts.ALQUILADO += enUso;
        totalGroupUnits += tot;
      }

      unitsMap[id] = {
        tipoControl: 'POR_CANTIDAD',
        desglose: {
          porEstado: groupCounts,
          porCliente: [],
        },
      };
    }

    const { ocupacionTotalPorcentaje, rentadoPorcentaje } = calculateOccupancy(groupCounts);

    const firstEq = grp.equipos[0];
    const precioDiaA = Number(firstEq?.precioRentaDia ?? firstEq?.producto?.precioRentaDia ?? 0);
    const precioDiaB = firstEq?.precioDiaB !== undefined && firstEq?.precioDiaB !== null ? Number(firstEq.precioDiaB) : (firstEq?.producto?.precioDiaB !== undefined && firstEq?.producto?.precioDiaB !== null ? Number(firstEq.producto.precioDiaB) : null);
    const precioDiaC = firstEq?.precioDiaC !== undefined && firstEq?.precioDiaC !== null ? Number(firstEq.precioDiaC) : (firstEq?.producto?.precioDiaC !== undefined && firstEq?.producto?.precioDiaC !== null ? Number(firstEq.producto.precioDiaC) : null);
    const precioHoraA = firstEq?.precioRentaHora !== undefined && firstEq?.precioRentaHora !== null ? Number(firstEq.precioRentaHora) : (firstEq?.producto?.precioRentaHora !== undefined && firstEq?.producto?.precioRentaHora !== null ? Number(firstEq.producto.precioRentaHora) : null);
    const precioHoraB = firstEq?.precioHoraB !== undefined && firstEq?.precioHoraB !== null ? Number(firstEq.precioHoraB) : (firstEq?.producto?.precioHoraB !== undefined && firstEq?.producto?.precioHoraB !== null ? Number(firstEq.producto.precioHoraB) : null);
    const precioHoraC = firstEq?.precioHoraC !== undefined && firstEq?.precioHoraC !== null ? Number(firstEq.precioHoraC) : (firstEq?.producto?.precioHoraC !== undefined && firstEq?.producto?.precioHoraC !== null ? Number(firstEq.producto.precioHoraC) : null);

    products.push({
      productoId: id,
      nombre: grp.nombre,
      familia: grp.familia,
      marca: grp.marca,
      tarifa: grp.tarifa,
      tipoControl: grp.tipoControl,
      total: totalGroupUnits,
      porEstado: groupCounts,
      porcentajeRentado: rentadoPorcentaje,
      porcentajeOcupacion: ocupacionTotalPorcentaje,
      precioDiaA,
      precioDiaB,
      precioDiaC,
      precioHoraA,
      precioHoraB,
      precioHoraC,
      equipoIds: grp.equipos.map((e) => e.id),
    });
  }

  // Orden inicial por total descendente
  products.sort((a, b) => b.total - a.total);

  const totalUnidades =
    overallCounts.DISPONIBLE +
    overallCounts.ALQUILADO +
    overallCounts.RESERVADO +
    overallCounts.EN_REPARACION +
    overallCounts.BAJA;

  const { ocupacionTotalPorcentaje } = calculateOccupancy(overallCounts);

  const summary: InventorySummary = {
    totalUnidades,
    porcentajeOcupacion: ocupacionTotalPorcentaje,
    unidadesDisponibles: overallCounts.DISPONIBLE,
    unidadesAlquiladas: overallCounts.ALQUILADO,
    unidadesReservadas: overallCounts.RESERVADO,
    unidadesEnReparacion: overallCounts.EN_REPARACION,
    unidadesBaja: overallCounts.BAJA,
  };

  return { summary, products, unitsMap };
}
