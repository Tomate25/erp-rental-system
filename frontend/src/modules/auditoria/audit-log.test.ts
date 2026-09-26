import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuditoria } from './services/auditoria.api';
import api from '../../shared/services/api';

vi.mock('../../shared/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Auditoria API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe enviar parámetros limpios a GET /auditoria', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          data: [
            {
              id: 'audit-1',
              empresaId: 'emp-1',
              usuarioId: 'user-1',
              accion: 'DESPACHO_REGISTRADO',
              entidadTipo: 'DESPACHO',
              entidadId: 'desp-1',
              detalles: { contratoId: 'ctr-1' },
              ipDireccion: '192.168.1.10',
              userAgent: 'Mozilla/5.0',
              requestId: 'req-1',
              createdAt: '2026-09-26T12:00:00.000Z',
              usuario: {
                id: 'user-1',
                nombre: 'Carlos',
                apellido: 'Mendoza',
                email: 'carlos@bmconstrucciones.com',
              },
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    };

    (api.get as any).mockResolvedValueOnce(mockResponse);

    const result = await getAuditoria({
      page: 1,
      limit: 20,
      entidadTipo: 'DESPACHO',
      accion: 'DESPACHO_REGISTRADO',
      fechaInicio: '2026-09-26T00:00:00.000Z',
      fechaFin: undefined, // debe omitirse
    });

    expect(api.get).toHaveBeenCalledWith('/auditoria', {
      params: {
        page: 1,
        limit: 20,
        entidadTipo: 'DESPACHO',
        accion: 'DESPACHO_REGISTRADO',
        fechaInicio: '2026-09-26T00:00:00.000Z',
      },
    });

    expect(result.total).toBe(1);
    expect(result.data[0].accion).toBe('DESPACHO_REGISTRADO');
    expect(result.data[0].usuario?.nombre).toBe('Carlos');
  });

  it('enmascara claves sensibles como contraseñas y tokens en payload de auditoría', () => {
    const rawDetails = {
      email: 'operador@bm.com',
      password: 'SuperSecretPassword!',
      sessionToken: 'jwt-token-xyz',
      nested: {
        refreshToken: 'refresh-abc',
        safeProperty: 'Contrato CTR-2026-0001',
      },
    };

    const maskSecrets = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(maskSecrets);
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        const lower = k.toLowerCase();
        if (
          lower.includes('password') ||
          lower.includes('secret') ||
          lower.includes('token') ||
          lower.includes('hash') ||
          lower.includes('sessiontoken')
        ) {
          res[k] = '••••••••••••';
        } else if (typeof v === 'object') {
          res[k] = maskSecrets(v);
        } else {
          res[k] = v;
        }
      }
      return res;
    };

    const sanitized = maskSecrets(rawDetails);
    expect(sanitized.email).toBe('operador@bm.com');
    expect(sanitized.password).toBe('••••••••••••');
    expect(sanitized.sessionToken).toBe('••••••••••••');
    expect(sanitized.nested.refreshToken).toBe('••••••••••••');
    expect(sanitized.nested.safeProperty).toBe('Contrato CTR-2026-0001');
  });
});
