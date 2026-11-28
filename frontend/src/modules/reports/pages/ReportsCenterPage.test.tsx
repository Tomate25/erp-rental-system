import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReportsCenterPage } from './ReportsCenterPage';
import { ReportViewerPanel } from '../components/ReportViewerPanel';
import { DocumentVoidingCenter } from '../components/DocumentVoidingCenter';
import { VoidingImpactModal } from '../components/VoidingImpactModal';
import { ModuleAccessProvider } from '../../../shared/context/ModuleAccessContext';
import type {
  ReportPayload,
  VoidingImpactPreview,
} from '../types/reports.types';

const sampleReport: ReportPayload = {
  tipo: 'maquinaria_usada',
  titulo: 'Reporte de Maquinaria Usada, Salidas en Campo y Horómetros',
  subtitulo: 'Trazabilidad completa de utilización real de equipos.',
  modulo: 'Operaciones y Horómetros',
  generadoEn: '2026-11-27T18:00:00Z',
  filtros: {},
  kpis: [
    { label: 'Movimientos de Maquinaria', value: 4, format: 'number', tone: 'blue' },
    { label: 'Total Horas Trabajadas', value: 120, format: 'number', tone: 'emerald' },
  ],
  columnas: [
    { key: 'despacho', label: 'Despacho', type: 'text' },
    { key: 'equipo', label: 'Maquinaria / Modelo', type: 'text', pivotDimension: true },
    { key: 'situacion', label: 'Situación', type: 'badge', pivotDimension: true },
    { key: 'horasTrabajadas', label: 'Horas Trabajadas', type: 'number', sumInTotals: true, pivotMetric: true },
  ],
  filas: [
    {
      despacho: 'DSP-0001',
      equipo: 'Retroexcavadora 416E',
      situacion: 'RETORNADA',
      horasTrabajadas: 40,
    },
  ],
  resumenesDinamicos: [
    {
      id: 'por_equipo',
      titulo: 'Ranking de Maquinaria Más Utilizada',
      dimensionKey: 'equipo',
      dimensionLabel: 'Maquinaria',
      metricKey: 'horasTrabajadas',
      metricLabel: 'Horas Trabajadas',
      metricFormat: 'number',
      rows: [
        {
          clave: 'Retroexcavadora 416E',
          cantidad: 1,
          metricaPrincipal: 40,
          participacion: 100,
        },
      ],
    },
  ],
  hojasAdicionales: [
    {
      id: 'utilizacion_por_equipo',
      nombreHoja: 'Utilización por Equipo',
      titulo: 'Consolidado Acumulado',
      subtitulo: 'Veces rentada y horas',
      columnas: [{ key: 'modelo', label: 'Equipo', type: 'text' }],
      filas: [{ modelo: 'Retroexcavadora 416E' }],
    },
  ],
  estadosDisponibles: ['EN_CAMPO', 'RETORNADA'],
};

const samplePreview: VoidingImpactPreview = {
  tipoDocumento: 'CONTRATO',
  documentoId: 'ctr-1',
  codigo: 'CTR-2026-0005',
  fecha: '2026-11-22',
  tercero: 'Constructora Sur',
  monto: 4000,
  estadoActual: 'ACTIVO',
  estadoResultante: 'CANCELADO',
  puedeAnular: true,
  bloqueos: [],
  advertencias: [],
  impactoInventario: {
    tieneImpacto: true,
    tipoInventario: 'FLOTA_MAQUINARIA',
    resumen: 'Se liberará 1 equipo reservado devolviéndolo a estado DISPONIBLE.',
    items: [
      {
        id: 'eq-1',
        codigo: '08-01',
        nombre: 'Mini Excavadora CAT',
        tipoControl: 'SERIALIZADO',
        estadoActual: 'RESERVADO',
        estadoResultante: 'DISPONIBLE',
        stockActual: 0,
        cambioStock: 1,
        stockResultante: 1,
        accion: 'LIBERAR_RESERVA',
        detalle: 'Reserva cancelada y maquinaria disponible.',
      },
    ],
  },
  impactoContable: {
    tieneImpacto: true,
    mecanismo: 'EXCLUSION_POLIZA_AUTOMATICA',
    resumen: 'Se libera el depósito en garantía por C$ 500.00.',
    efectoBalanceGeneral: 'Disminuye Banco y Pasivo por Depósitos.',
    efectoEstadoResultados: 'Sin efecto en P&L.',
    partidasReversion: [
      {
        cuentaCodigo: '210409',
        cuentaNombre: 'OTROS',
        naturaleza: 'Acreedora',
        debe: 500,
        haber: 0,
        concepto: 'Liberación depósito garantía',
        saldoAntes: 1500,
        saldoDespues: 1000,
      },
      {
        cuentaCodigo: '110201',
        cuentaNombre: 'LA FISE 750-100-489',
        naturaleza: 'Deudora',
        debe: 0,
        haber: 500,
        concepto: 'Reversión depósito banco',
        saldoAntes: 20000,
        saldoDespues: 19500,
      },
    ],
    totalDebe: 500,
    totalHaber: 500,
    cuadrado: true,
  },
  documentosRelacionados: [
    {
      tipo: 'CORTE_FACTURACION',
      codigo: 'Corte #1',
      estadoActual: 'PENDIENTE',
      estadoResultante: 'ANULADO',
      detalle: 'Corte pendiente anulado.',
    },
  ],
};

describe('ReportsCenterPage & Componentes de Reportes / Anulación', () => {
  it('renderiza la cabecera y pestañas principales de ReportsCenterPage', () => {
    const html = renderToStaticMarkup(
      <ModuleAccessProvider moduleId="reports" level="ESCRITURA">
        <ReportsCenterPage />
      </ModuleAccessProvider>,
    );

    expect(html).toContain('Centro de Reportes y Anulaciones');
    expect(html).toContain('Anular Documentos');
    expect(html).toContain('Exportar Excel Dinámico (.xlsx)');
    expect(html).toContain('Consolidado Todo el ERP');
  });

  it('renderiza ReportViewerPanel con datos de maquinaria usada, KPIs y botón de Tabla Dinámica', () => {
    const html = renderToStaticMarkup(
      <ReportViewerPanel
        report={sampleReport}
        loading={false}
        filters={{}}
        exportingSingle={false}
        exportingConsolidated={false}
        onChangeFilters={vi.fn()}
        onRefresh={vi.fn()}
        onExportSingle={vi.fn()}
        onExportConsolidated={vi.fn()}
      />,
    );

    expect(html).toContain('Reporte de Maquinaria Usada');
    expect(html).toContain('Retroexcavadora 416E');
    expect(html).toContain('Tabla Dinámica (Agrupación)');
    expect(html).toContain('Utilización por Equipo');
    expect(html).toContain('Exportar Excel Dinámico (.xlsx)');
  });

  it('renderiza VoidingImpactModal mostrando impacto en inventario (stock/estado) y cuentas contables (antes/después)', () => {
    const html = renderToStaticMarkup(
      <VoidingImpactModal
        preview={samplePreview}
        loading={false}
        canExecute={true}
        onClose={vi.fn()}
        onConfirmVoid={vi.fn()}
      />,
    );

    expect(html).toContain('CTR-2026-0005');
    expect(html).toContain('Comportamiento del Inventario');
    expect(html).toContain('Mini Excavadora CAT');
    expect(html).toContain('DISPONIBLE');
    expect(html).toContain('Impacto en Cuentas Contables');
    expect(html).toContain('210409');
    expect(html).toContain('110201');
    expect(html).toContain('Partida Cuadrada ✓');
    expect(html).toContain('Confirmar Anulación');
  });

  it('renderiza DocumentVoidingCenter con accesos rápidos a documentos principales y reglas de protección', () => {
    const html = renderToStaticMarkup(
      <DocumentVoidingCenter canExecuteVoiding={true} />,
    );

    expect(html).toContain('Principales (5)');
    expect(html).toContain('Facturas');
    expect(html).toContain('Recibos de Caja');
    expect(html).toContain('Compras de Insumos');
    expect(html).toContain('Contratos');
    expect(html).toContain('Notas CxC');
    expect(html).toContain('Factura con Recibo:');
    expect(html).toContain('Equipos en obra:');
  });
});
