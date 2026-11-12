import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PromotionModal } from './components/PromotionModal';
import { ApplyPromotionModal } from '../quotations/components/ApplyPromotionModal';
import * as promotionsApi from './services/promotions.api';
import api from '../../shared/services/api';
import type { Promocion } from './types/promotion.types';

const mockPromocion: Promocion = {
  id: 'promo-1',
  empresaId: 'emp-1',
  codigo: 'COMBO-CIMIENTO',
  nombre: 'Combo Cimentación: 2 Bailarinas + 1 Cortadora',
  descripcion: 'Combo especial para fase de fundaciones',
  precioCombo: 1200,
  tipoCobro: 'POR_DIA',
  diasMinimos: 2,
  fechaInicio: '2026-01-01',
  fechaFin: '2026-12-31',
  activo: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  items: [
    {
      id: 'item-1',
      productoId: 'prod-1',
      cantidad: 2,
      precioUnitarioSugerido: 500,
      producto: {
        id: 'prod-1',
        nombre: 'Apisonador / Bailarina Wacker Neuson',
        codigo: 'BAIL-01',
        precioRentaDia: 500,
      },
    },
    {
      id: 'item-2',
      productoId: 'prod-2',
      cantidad: 1,
      precioUnitarioSugerido: 400,
      producto: {
        id: 'prod-2',
        nombre: 'Cortadora de Concreto Husqvarna',
        codigo: 'CORT-01',
        precioRentaDia: 400,
      },
    },
  ],
};

describe('Módulo de Promociones y Combos - Frontend Tests', () => {
  it('exporta correctamente los métodos de promotions.api', () => {
    expect(typeof promotionsApi.getPromotions).toBe('function');
    expect(typeof promotionsApi.getPromotionById).toBe('function');
    expect(typeof promotionsApi.createPromotion).toBe('function');
    expect(typeof promotionsApi.updatePromotion).toBe('function');
    expect(typeof promotionsApi.deletePromotion).toBe('function');
  });

  it('getPromotions delega a api.get con parámetros', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: [mockPromocion] });
    const result = await promotionsApi.getPromotions({ activo: true });

    expect(result).toHaveLength(1);
    expect(result[0].codigo).toBe('COMBO-CIMIENTO');
    expect(getSpy).toHaveBeenCalledWith('/promotions', {
      params: { activo: true },
    });
  });

  it('createPromotion delega a api.post', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: mockPromocion });
    const payload = {
      codigo: 'COMBO-CIMIENTO',
      nombre: 'Combo Cimentación',
      precioCombo: 1200,
    };
    const result = await promotionsApi.createPromotion(payload);

    expect(result.id).toBe('promo-1');
    expect(postSpy).toHaveBeenCalledWith('/promotions', payload);
  });

  it('PromotionModal no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <PromotionModal isOpen={false} onClose={() => undefined} onSave={async () => undefined} />,
    );
    expect(html).toBe('');
  });

  it('PromotionModal renderiza el formulario con campos de combo y máquinas', () => {
    const html = renderToStaticMarkup(
      <PromotionModal isOpen={true} onClose={() => undefined} onSave={async () => undefined} />,
    );
    expect(html).toContain('Nueva Promoción / Combo de Maquinaria');
    expect(html).toContain('Código Promo');
    expect(html).toContain('Nombre del Combo');
    expect(html).toContain('Precio Combo');
    expect(html).toContain('Días Mínimos');
    expect(html).toContain('Máquinas / Equipos del Combo');
    expect(html).toContain('Agregar Máquina al Combo');
  });

  it('ApplyPromotionModal no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <ApplyPromotionModal
        isOpen={false}
        onClose={() => undefined}
        onSelectPromotion={() => undefined}
      />,
    );
    expect(html).toBe('');
  });

  it('ApplyPromotionModal renderiza el diálogo de selección de combos', () => {
    const html = renderToStaticMarkup(
      <ApplyPromotionModal
        isOpen={true}
        onClose={() => undefined}
        onSelectPromotion={() => undefined}
      />,
    );
    expect(html).toContain('Promociones y Combos Disponibles');
    expect(html).toContain('Selecciona un combo para aplicar automáticamente los equipos');
  });
});
