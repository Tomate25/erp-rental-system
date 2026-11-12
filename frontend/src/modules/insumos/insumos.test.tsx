import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { InsumoModal } from './components/InsumoModal';
import { AjustarStockModal } from './components/AjustarStockModal';
import { RegistrarMovimientoModal } from './components/RegistrarMovimientoModal';
import { KardexMovimientosTable } from './components/KardexMovimientosTable';
import * as insumoApi from './services/insumo.api';
import api from '../../shared/services/api';
import type { Insumo } from './types/insumo.types';

const mockInsumo: Insumo = {
  id: 'ins-1',
  empresaId: 'emp-1',
  codigo: 'INS-001',
  nombre: 'Aceite 15W-40 Premium',
  descripcion: 'Aceite multigrado para motores diésel de maquinaria pesada',
  categoria: 'LUBRICANTES',
  unidadMedida: 'GALON',
  stockActual: 15,
  stockMinimo: 3,
  costoUnitario: 450,
  costoIncluyeIva: true,
  aplicaIva: true,
  precioVenta: 550,
  proveedorId: 'prov-1',
  proveedor: { id: 'prov-1', nombre: 'Distribuidora Shell' },
  activo: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  _count: { consumos: 5 },
};

describe('Módulo de Insumos y Bodega - Frontend Tests', () => {
  it('exporta correctamente todos los métodos del API de insumos', () => {
    expect(typeof insumoApi.getInsumos).toBe('function');
    expect(typeof insumoApi.getInsumoById).toBe('function');
    expect(typeof insumoApi.createInsumo).toBe('function');
    expect(typeof insumoApi.updateInsumo).toBe('function');
    expect(typeof insumoApi.ajustarStockInsumo).toBe('function');
    expect(typeof insumoApi.deleteInsumo).toBe('function');
    expect(typeof insumoApi.registrarMovimientoInsumo).toBe('function');
    expect(typeof insumoApi.getMovimientosInsumos).toBe('function');
  });

  it('getInsumos delega correctamente a api.get con parámetros de búsqueda y categoría', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: [mockInsumo] });
    const result = await insumoApi.getInsumos({
      categoria: 'LUBRICANTES',
      activo: true,
      bajoStock: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Aceite 15W-40 Premium');
    expect(getSpy).toHaveBeenCalledWith('/insumos', {
      params: { categoria: 'LUBRICANTES', activo: true, bajoStock: true },
    });
  });

  it('ajustarStockInsumo delega a api.patch con payload correcto', async () => {
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { ...mockInsumo, stockActual: 20 },
    });
    const payload = {
      cantidad: 5,
      tipoAjuste: 'ENTRADA' as const,
      motivo: 'Compra de 5 galones',
      costoUnitario: 460,
    };
    const result = await insumoApi.ajustarStockInsumo('ins-1', payload);

    expect(result.stockActual).toBe(20);
    expect(patchSpy).toHaveBeenCalledWith('/insumos/ins-1/ajustar-stock', payload);
  });

  it('InsumoModal no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <InsumoModal isOpen={false} onClose={() => undefined} onSuccess={() => undefined} />,
    );
    expect(html).toBe('');
  });

  it('InsumoModal renderiza campos de IVA y datos del insumo cuando está abierto', () => {
    const html = renderToStaticMarkup(
      <InsumoModal
        isOpen={true}
        onClose={() => undefined}
        onSuccess={() => undefined}
        insumoToEdit={mockInsumo}
      />,
    );
    expect(html).toContain('Editar Insumo de Taller');
    expect(html).toContain('Aceite 15W-40 Premium');
    expect(html).toContain('Control Fiscal y Tratamiento de IVA');
    expect(html).toContain('Costo de compra incluye IVA');
  });

  it('AjustarStockModal renderiza opciones de entrada, salida y conteo físico', () => {
    const html = renderToStaticMarkup(
      <AjustarStockModal
        isOpen={true}
        onClose={() => undefined}
        onSuccess={() => undefined}
        insumo={mockInsumo}
      />,
    );
    expect(html).toContain('Movimiento de Bodega');
    expect(html).toContain('Entrada');
    expect(html).toContain('Salida');
    expect(html).toContain('Conteo Físico');
  });

  it('RegistrarMovimientoModal renderiza salida manual con campos de destino y motivo', () => {
    const html = renderToStaticMarkup(
      <RegistrarMovimientoModal
        isOpen={true}
        onClose={() => undefined}
        onSuccess={() => undefined}
        insumos={[mockInsumo]}
        initialInsumo={mockInsumo}
        initialTipo="SALIDA"
      />,
    );
    expect(html).toContain('Salida Manual de Bodega');
    expect(html).toContain('Despacho directo de insumos sin requerir orden de mantenimiento');
    expect(html).toContain('Destino / Área Receptora');
    expect(html).toContain('Motivo o Justificación');
    expect(html).toContain('Confirmar Salida de Bodega');
  });

  it('RegistrarMovimientoModal renderiza entrada de compras con campo de costo unitario', () => {
    const html = renderToStaticMarkup(
      <RegistrarMovimientoModal
        isOpen={true}
        onClose={() => undefined}
        onSuccess={() => undefined}
        insumos={[mockInsumo]}
        initialInsumo={mockInsumo}
        initialTipo="ENTRADA"
      />,
    );
    expect(html).toContain('Entrada / Recepción de Insumo');
    expect(html).toContain('Costo Unitario de Compra');
    expect(html).toContain('Confirmar Entrada a Bodega');
  });

  it('KardexMovimientosTable renderiza estructura de tabla y filtros', () => {
    const html = renderToStaticMarkup(
      <KardexMovimientosTable insumos={[mockInsumo]} />,
    );
    expect(html).toContain('Kardex de Movimientos de Bodega');
    expect(html).toContain('Todos los Movimientos');
    expect(html).toContain('Stock (Ant → Nvo)');
    expect(html).toContain('Motivo / Destino');
  });
});
