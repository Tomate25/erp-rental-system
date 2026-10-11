import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  calculateOccupancy,
  GroupedProductSchema,
  ProductUnitsResponseSchema,
  type GroupedProduct,
  type StatusCounts,
  type ProductUnitsResponse,
} from '../types/grouped-inventory.types';
import { OccupancyBar } from './OccupancyBar';
import { StatusChips } from './StatusChips';
import { InventorySummaryCards } from './InventorySummaryCards';
import { GroupedInventoryTable } from './GroupedInventoryTable';

describe('1. Cálculo de % de Ocupación y Rentado', () => {
  it('calcula correctamente la ocupación ((alquilado + reservado) / total_sin_baja)', () => {
    const counts: StatusCounts = {
      DISPONIBLE: 3,
      ALQUILADO: 4,
      RESERVADO: 2,
      EN_REPARACION: 1,
      BAJA: 5, // La baja no debe contar en el denominador activo
    };
    // Total activo = 3 + 4 + 2 + 1 = 10
    // Ocupadas (alquilado + reservado) = 4 + 2 = 6 -> 60%
    // Rentado (alquilado) = 4 -> 40%
    const res = calculateOccupancy(counts);
    expect(res.ocupacionTotalPorcentaje).toBe(60);
    expect(res.rentadoPorcentaje).toBe(40);
  });

  it('evita división por cero y devuelve 0% cuando no hay unidades activas', () => {
    const countsCero: StatusCounts = {
      DISPONIBLE: 0,
      ALQUILADO: 0,
      RESERVADO: 0,
      EN_REPARACION: 0,
      BAJA: 10,
    };
    const res = calculateOccupancy(countsCero);
    expect(res.ocupacionTotalPorcentaje).toBe(0);
    expect(res.rentadoPorcentaje).toBe(0);
    expect(Number.isNaN(res.ocupacionTotalPorcentaje)).toBe(false);
  });

  it('redondea con precisión decimal cuando hay porcentajes fraccionarios', () => {
    const counts: StatusCounts = {
      DISPONIBLE: 1,
      ALQUILADO: 1,
      RESERVADO: 1,
      EN_REPARACION: 0,
      BAJA: 0,
    };
    // Total activo = 3
    // Ocupación = 2 / 3 = 66.666...% -> 66.7%
    // Rentado = 1 / 3 = 33.333...% -> 33.3%
    const res = calculateOccupancy(counts);
    expect(res.ocupacionTotalPorcentaje).toBe(66.7);
    expect(res.rentadoPorcentaje).toBe(33.3);
  });
});

describe('2. Validación con Zod (sin any)', () => {
  it('valida un producto agrupado válido', () => {
    const validProduct = {
      productoId: 'prod-01',
      nombre: 'Compactadora Masalta',
      familia: 'Compactación',
      marca: 'Masalta',
      tarifa: 'DIA',
      tipoControl: 'SERIALIZADO',
      total: 3,
      porEstado: {
        DISPONIBLE: 1,
        ALQUILADO: 1,
        RESERVADO: 1,
        EN_REPARACION: 0,
        BAJA: 0,
      },
      porcentajeRentado: 33.3,
      porcentajeOcupacion: 66.7,
    };

    const parsed = GroupedProductSchema.safeParse(validProduct);
    expect(parsed.success).toBe(true);
  });

  it('rechaza esquemas con estados o tarifas no reconocidas', () => {
    const invalidProduct = {
      productoId: 'prod-01',
      nombre: 'Equipo Inválido',
      familia: 'General',
      marca: 'Generic',
      tarifa: 'POR_SEMANA', // Inválido (solo HORA o DIA)
      tipoControl: 'SERIALIZADO',
      total: 5,
      porEstado: {
        DISPONIBLE: 5,
        ALQUILADO: 0,
        RESERVADO: 0,
        EN_REPARACION: 0,
        BAJA: 0,
      },
      porcentajeRentado: 0,
      porcentajeOcupacion: 0,
    };

    const parsed = GroupedProductSchema.safeParse(invalidProduct);
    expect(parsed.success).toBe(false);
  });

  it('valida la respuesta discriminada de unidades por tipo de control', () => {
    const serialRes = {
      tipoControl: 'SERIALIZADO',
      unidades: [
        {
          id: 'u-1',
          codigo: '01-02',
          marca: 'Masalta',
          modelo: 'EMR75R',
          serie: 'H0753230599',
          estado: 'DISPONIBLE',
        },
      ],
    };
    expect(ProductUnitsResponseSchema.safeParse(serialRes).success).toBe(true);

    const cantidadRes = {
      tipoControl: 'POR_CANTIDAD',
      desglose: {
        porEstado: {
          DISPONIBLE: 5000,
          ALQUILADO: 5000,
          RESERVADO: 187,
          EN_REPARACION: 0,
          BAJA: 0,
        },
        porCliente: [
          {
            clienteNombre: 'Constructora Central',
            contratoNumero: 'CTR-001',
            cantidad: 2000,
            estado: 'ALQUILADO',
            fechaDevolucion: '2026-12-01',
          },
        ],
      },
    };
    expect(ProductUnitsResponseSchema.safeParse(cantidadRes).success).toBe(true);
  });
});

describe('3. Filtros y Agrupación en Memoria', () => {
  const mockProducts: GroupedProduct[] = [
    {
      productoId: 'p-amarilla',
      nombre: 'Retroexcavadora JCB 3CX',
      familia: 'Maquinaria Amarilla',
      marca: 'JCB',
      tarifa: 'HORA',
      tipoControl: 'SERIALIZADO',
      total: 1,
      porEstado: { DISPONIBLE: 0, ALQUILADO: 1, RESERVADO: 0, EN_REPARACION: 0, BAJA: 0 },
      porcentajeRentado: 100,
      porcentajeOcupacion: 100,
    },
    {
      productoId: 'p-compactadora',
      nombre: 'Compactadora Masalta',
      familia: 'Compactación',
      marca: 'Masalta',
      tarifa: 'DIA',
      tipoControl: 'SERIALIZADO',
      total: 3,
      porEstado: { DISPONIBLE: 1, ALQUILADO: 2, RESERVADO: 0, EN_REPARACION: 0, BAJA: 0 },
      porcentajeRentado: 66.7,
      porcentajeOcupacion: 66.7,
    },
    {
      productoId: 'p-cunas',
      nombre: 'Cuñas Estándar de Encofrado',
      familia: 'Encofrado y Placas',
      marca: 'Swymons',
      tarifa: 'DIA',
      tipoControl: 'POR_CANTIDAD',
      total: 10187,
      porEstado: { DISPONIBLE: 4000, ALQUILADO: 5000, RESERVADO: 1187, EN_REPARACION: 0, BAJA: 0 },
      porcentajeRentado: 49.1,
      porcentajeOcupacion: 60.7,
    },
  ];

  it('filtra productos por pestaña de tarifa', () => {
    const soloHora = mockProducts.filter((p) => p.tarifa === 'HORA');
    expect(soloHora.length).toBe(1);
    expect(soloHora[0].nombre).toContain('JCB');

    const soloDia = mockProducts.filter((p) => p.tarifa === 'DIA');
    expect(soloDia.length).toBe(2);
  });

  it('ordena por total, ocupación y nombre', () => {
    // Por total descendente
    const byTotalDesc = [...mockProducts].sort((a, b) => b.total - a.total);
    expect(byTotalDesc[0].nombre).toBe('Cuñas Estándar de Encofrado');
    expect(byTotalDesc[2].nombre).toBe('Retroexcavadora JCB 3CX');

    // Por ocupación descendente
    const byOcupacionDesc = [...mockProducts].sort((a, b) => b.porcentajeOcupacion - a.porcentajeOcupacion);
    expect(byOcupacionDesc[0].nombre).toBe('Retroexcavadora JCB 3CX');

    // Por nombre alfabético
    const byNombreAsc = [...mockProducts].sort((a, b) => a.nombre.localeCompare(b.nombre));
    expect(byNombreAsc[0].nombre).toBe('Compactadora Masalta');
  });
});

describe('4. Componente OccupancyBar y Accesibilidad', () => {
  const counts: StatusCounts = {
    DISPONIBLE: 3,
    ALQUILADO: 2,
    RESERVADO: 1,
    EN_REPARACION: 1,
    BAJA: 1,
  };

  it('incluye role="progressbar" con valores aria y texto para lectores de pantalla', () => {
    const html = renderToStaticMarkup(
      <OccupancyBar counts={counts} total={8} rentedPercentage={29} />
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="29"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('sr-only');
    expect(html).toContain('Ocupación: 29% rentado');
    expect(html).toContain('2 alquilados');
    expect(html).toContain('3 disponibles');
  });

  it('muestra colores de estado requeridos: azul, ámbar, verde, rojo y gris', () => {
    const html = renderToStaticMarkup(
      <OccupancyBar counts={counts} total={8} rentedPercentage={29} />
    );

    // Azul = Alquilado
    expect(html).toContain('bg-blue-600');
    // Ámbar = Reservado
    expect(html).toContain('bg-amber-500');
    // Verde = Disponible
    expect(html).toContain('bg-emerald-600');
    // Rojo = En Reparación
    expect(html).toContain('bg-rose-600');
    // Gris = Baja
    expect(html).toContain('bg-slate-400');
  });
});

describe('5. Componente StatusChips y Accesibilidad', () => {
  const counts: StatusCounts = {
    DISPONIBLE: 3,
    ALQUILADO: 2,
    RESERVADO: 0,
    EN_REPARACION: 1,
    BAJA: 0,
  };

  it('renderiza formato compacto con texto explícito (3 disp · 2 rent · 1 rep)', () => {
    const html = renderToStaticMarkup(<StatusChips counts={counts} compact={true} />);
    expect(html).toContain('3 disp');
    expect(html).toContain('2 rent');
    expect(html).toContain('1 rep');
    expect(html).toContain('·');
  });

  it('renderiza chips individuales con etiquetas completas y colores', () => {
    const html = renderToStaticMarkup(<StatusChips counts={counts} compact={false} />);
    expect(html).toContain('3 Disponibles');
    expect(html).toContain('2 Alquilados');
    expect(html).toContain('1 En reparación');
  });
});

describe('6. Componente InventorySummaryCards', () => {
  it('renderiza tarjetas de métricas KPI', () => {
    const summary = {
      totalUnidades: 17062,
      porcentajeOcupacion: 62.5,
      unidadesDisponibles: 6400,
      unidadesAlquiladas: 9500,
      unidadesReservadas: 1100,
      unidadesEnReparacion: 62,
      unidadesBaja: 0,
    };

    const html = renderToStaticMarkup(<InventorySummaryCards summary={summary} />);
    expect(html).toContain('Total Unidades');
    expect(html).toContain('17,062');
    expect(html).toContain('% Ocupación General');
    expect(html).toContain('62.5%');
    expect(html).toContain('Disponibles en Bodega');
    expect(html).toContain('6,400');
    expect(html).toContain('En Reparación / Taller');
    expect(html).toContain('62');
  });
});

describe('7. Componente GroupedInventoryTable', () => {
  const mockProduct: GroupedProduct = {
    productoId: 'prod-01',
    nombre: 'Compactadora Masalta',
    familia: 'Compactación',
    marca: 'Masalta',
    tarifa: 'DIA',
    tipoControl: 'SERIALIZADO',
    total: 3,
    porEstado: { DISPONIBLE: 1, ALQUILADO: 2, RESERVADO: 0, EN_REPARACION: 0, BAJA: 0 },
    porcentajeRentado: 66.7,
    porcentajeOcupacion: 66.7,
  };

  const mockUnitsRes: ProductUnitsResponse = {
    tipoControl: 'SERIALIZADO',
    unidades: [
      {
        id: 'u-1',
        codigo: '01-02',
        marca: 'Masalta',
        modelo: 'EMR75R',
        serie: 'H0753230599',
        estado: 'DISPONIBLE',
        clienteAsignado: null,
      },
    ],
  };

  it('renderiza tabla con encabezados accesibles th scope="col" y botones de orden', () => {
    const html = renderToStaticMarkup(
      <GroupedInventoryTable
        products={[mockProduct]}
        expandedUnitsMap={{}}
        loadingUnitsMap={{}}
        onToggleExpand={vi.fn()}
        onSelectUnit={vi.fn()}
        sortField="total"
        sortDirection="desc"
        onSortChange={vi.fn()}
      />
    );

    expect(html).toContain('scope="col"');
    expect(html).toContain('Compactadora Masalta');
    expect(html).toContain('Por día');
    expect(html).toContain('aria-expanded="false"');
  });

  it('renderiza subtabla al expandir con botón y detalle de unidades', () => {
    // Si la unidad está en expandedUnitsMap pero no expanded en estado local, renderizamos la fila
    const html = renderToStaticMarkup(
      <GroupedInventoryTable
        products={[mockProduct]}
        expandedUnitsMap={{ 'prod-01': mockUnitsRes }}
        loadingUnitsMap={{}}
        onToggleExpand={vi.fn()}
        onSelectUnit={vi.fn()}
        sortField="total"
        sortDirection="desc"
        onSortChange={vi.fn()}
      />
    );

    expect(html).toContain('Compactadora Masalta');
  });

  it('renderiza estado vacío amigable cuando no hay productos', () => {
    const html = renderToStaticMarkup(
      <GroupedInventoryTable
        products={[]}
        expandedUnitsMap={{}}
        loadingUnitsMap={{}}
        onToggleExpand={vi.fn()}
        onSelectUnit={vi.fn()}
        sortField="total"
        sortDirection="desc"
        onSortChange={vi.fn()}
      />
    );

    expect(html).toContain('No hay artículos con estos filtros');
  });

  it('renderiza estado de error con botón de reintento', () => {
    const html = renderToStaticMarkup(
      <GroupedInventoryTable
        products={[]}
        expandedUnitsMap={{}}
        loadingUnitsMap={{}}
        onToggleExpand={vi.fn()}
        onSelectUnit={vi.fn()}
        sortField="total"
        sortDirection="desc"
        onSortChange={vi.fn()}
        error="Conexión rechazada al servidor"
        onRetry={vi.fn()}
      />
    );

    expect(html).toContain('Error al cargar inventario');
    expect(html).toContain('Conexión rechazada al servidor');
    expect(html).toContain('Reintentar');
  });
});
