import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ProviderModal } from './components/ProviderModal';
import { ProviderDetailModal } from './components/ProviderDetailModal';
import * as providersApi from './services/providers.api';
import api from '../../shared/services/api';
import type { Provider } from './types/provider.types';

const mockProvider: Provider = {
  id: 'prov-1',
  empresaId: 'emp-1',
  nombre: 'Maquinter S.A.',
  razonSocial: 'Maquinarias Internacionales S.A.',
  identificacion: 'J0310000123456',
  telefono: '8888-8888',
  email: 'contacto@maquinter.com',
  direccion: 'Carretera Norte',
  contacto: 'Ing. Carlos Mendoza',
  tipo: 'MAQUINARIA_EXTERNA',
  condicionPago: 'CREDITO',
  plazoCreditoDias: 30,
  notas: 'Proveedor confiable de grúas',
  activo: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  _count: { equipos: 3 },
};

describe('Módulo de Proveedores - Frontend Tests', () => {
  it('exporta correctamente los métodos de providers.api', () => {
    expect(typeof providersApi.getProviders).toBe('function');
    expect(typeof providersApi.getProviderById).toBe('function');
    expect(typeof providersApi.createProvider).toBe('function');
    expect(typeof providersApi.updateProvider).toBe('function');
    expect(typeof providersApi.deleteProvider).toBe('function');
  });

  it('getProviders delega correctamente a api.get con parámetros', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: [mockProvider] });
    const result = await providersApi.getProviders({ tipo: 'MAQUINARIA_EXTERNA', activo: true });

    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Maquinter S.A.');
    expect(getSpy).toHaveBeenCalledWith('/providers', {
      params: { tipo: 'MAQUINARIA_EXTERNA', activo: true },
    });
  });

  it('createProvider delega a api.post', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: mockProvider });
    const payload = { nombre: 'Maquinter S.A.', tipo: 'MAQUINARIA_EXTERNA' as const };
    const result = await providersApi.createProvider(payload);

    expect(result.id).toBe('prov-1');
    expect(postSpy).toHaveBeenCalledWith('/providers', payload);
  });

  it('ProviderModal no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <ProviderModal isOpen={false} onClose={() => undefined} onSuccess={() => undefined} />,
    );
    expect(html).toBe('');
  });

  it('ProviderModal renderiza el formulario de alta con los campos requeridos', () => {
    const html = renderToStaticMarkup(
      <ProviderModal isOpen={true} onClose={() => undefined} onSuccess={() => undefined} />,
    );
    expect(html).toContain('Registrar Nuevo Proveedor');
    expect(html).toContain('Nombre Comercial');
    expect(html).toContain('Razón Social');
    expect(html).toContain('Tipo de Proveedor');
    expect(html).toContain('Maquinaria Externa (Subalquiler / Préstamo)');
    expect(html).toContain('Insumos y Repuestos');
    expect(html).toContain('Servicios de Taller');
  });

  it('ProviderModal renderiza en modo edición con los datos iniciales', () => {
    const html = renderToStaticMarkup(
      <ProviderModal
        isOpen={true}
        onClose={() => undefined}
        onSuccess={() => undefined}
        providerToEdit={mockProvider}
      />,
    );
    expect(html).toContain('Editar Proveedor');
    expect(html).toContain('Maquinter S.A.');
    expect(html).toContain('Maquinarias Internacionales S.A.');
    expect(html).toContain('J0310000123456');
    expect(html).toContain('Guardar Cambios');
  });

  it('ProviderDetailModal no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <ProviderDetailModal isOpen={false} onClose={() => undefined} providerId="prov-1" />,
    );
    expect(html).toBe('');
  });

  it('ProviderDetailModal renderiza el contenedor cuando isOpen es true', () => {
    const html = renderToStaticMarkup(
      <ProviderDetailModal isOpen={true} onClose={() => undefined} providerId={null} />,
    );
    expect(html).toContain('No se pudo obtener la información del proveedor');
  });
});
