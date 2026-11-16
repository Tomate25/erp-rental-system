import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import api from '../../shared/services/api';
import * as purchasesApi from './services/purchases.api';
import { CompraInsumoModal } from './components/CompraInsumoModal';
import { SubarriendoModal } from './components/SubarriendoModal';
import { PagoCompraModal } from './components/PagoCompraModal';
import { PurchasesPage } from './pages/PurchasesPage';
import type { Provider } from '../providers/types/provider.types';
import type { Insumo } from '../insumos/types/insumo.types';
import type { EquipoExternoInventario } from './types/purchases.types';

const mockProvider: Provider = {
  id: 'prov-1',
  empresaId: 'emp-1',
  nombre: 'Proveedora Industrial S.A.',
  tipo: 'MAQUINARIA_EXTERNA',
  condicionPago: 'CREDITO',
  plazoCreditoDias: 30,
  activo: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockInsumo: Insumo = {
  id: 'ins-1',
  empresaId: 'emp-1',
  codigo: 'INS-001',
  nombre: 'Aceite 15W-40',
  categoria: 'LUBRICANTES',
  unidadMedida: 'GALON',
  stockActual: 10,
  stockMinimo: 2,
  costoUnitario: 450,
  costoIncluyeIva: true,
  aplicaIva: true,
  activo: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockEquipoExterno: EquipoExternoInventario = {
  id: 'eq-1',
  codigo: 'EXT-01',
  modelo: 'Excavadora CAT 320D',
  numeroSerie: 'CAT320-99',
  estado: 'DISPONIBLE',
  origenEquipo: 'PROVEEDOR',
  proveedorId: 'prov-1',
  proveedorNombre: 'Proveedora Industrial S.A.',
  precioProveedor: 2500,
  disponibleParaRenta: true,
};

describe('Módulo de Compras y Maquinaria Externa - Frontend Tests', () => {
  it('exporta y delega métodos de purchases.api correctamente', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] } });
    await purchasesApi.getComprasInsumos({ estado: 'RECIBIDA' });
    expect(getSpy).toHaveBeenCalledWith('/purchases/insumos', {
      params: { estado: 'RECIBIDA' },
    });

    await purchasesApi.getMaquinariaExterna({ estado: 'ACTIVO' });
    expect(getSpy).toHaveBeenCalledWith('/purchases/maquinaria-externa', {
      params: { estado: 'ACTIVO' },
    });
  });

  it('CompraInsumoModal renderiza formulario multi-línea de compra de insumos', () => {
    const html = renderToStaticMarkup(
      <CompraInsumoModal
        isOpen={true}
        onClose={() => undefined}
        onSuccess={() => undefined}
        providers={[mockProvider]}
        insumos={[mockInsumo]}
      />,
    );
    expect(html).toContain('Nueva Compra de Insumos y Repuestos');
    expect(html).toContain('Detalle de Insumos a Comprar');
    expect(html).toContain('IVA Acreditable (15%)');
    expect(html).toContain('TOTAL COMPRA:');
  });

  it('SubarriendoModal renderiza campos de período de maquinaria externa', () => {
    const html = renderToStaticMarkup(
      <SubarriendoModal
        isOpen={true}
        onClose={() => undefined}
        onSuccess={() => undefined}
        equipos={[mockEquipoExterno]}
        providers={[mockProvider]}
        initialEquipo={mockEquipoExterno}
      />,
    );
    expect(html).toContain('Registrar Período de Maquinaria Externa (Proveedor)');
    expect(html).toContain('Modalidad de Cobro del Proveedor');
    expect(html).toContain('Fecha Fin / Devolución Estimada');
    expect(html).toContain('Costo Estimado del Período al Proveedor:');
  });

  it('PagoCompraModal renderiza saldo pendiente y confirmación a cuenta 210101', () => {
    const html = renderToStaticMarkup(
      <PagoCompraModal
        isOpen={true}
        onClose={() => undefined}
        title="Pagar Compra OC-2026-00001"
        subtitle="Proveedora Industrial S.A."
        saldoPendiente={1500}
        onSubmitPago={async () => undefined}
      />,
    );
    expect(html).toContain('Pagar Compra OC-2026-00001');
    expect(html).toContain('Saldo Pendiente Actual:');
    expect(html).toContain('Confirmar Pago (210101)');
  });

  it('PurchasesPage renderiza pestañas de Maquinaria de Proveedores y Compras de Insumos', () => {
    const html = renderToStaticMarkup(<PurchasesPage />);
    expect(html).toContain('Compras y Subarriendo de Maquinaria');
    expect(html).toContain('Maquinaria de Proveedores');
    expect(html).toContain('Compras de Insumos');
  });
});
