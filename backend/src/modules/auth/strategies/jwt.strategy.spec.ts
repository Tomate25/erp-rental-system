import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockPrisma: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET')
          return 'test-access-secret-32-chars-minimum!';
        return null;
      }),
    };

    mockPrisma = {
      usuario: {
        findUnique: jest.fn(),
      },
    };

    strategy = new JwtStrategy(mockConfigService, mockPrisma);
  });

  it('debe rechazar token si falta el claim sessionToken (anti-bypass de sesión)', async () => {
    const payloadWithoutSession: any = {
      sub: 'usr-1',
      email: 'user@test.com',
    };

    await expect(strategy.validate(payloadWithoutSession)).rejects.toThrow(
      new UnauthorizedException('Token inválido: falta claim de sesión'),
    );
  });

  it('debe rechazar si el sessionToken en BD no coincide con el payload (sesión revocada/iniciada en otro equipo)', async () => {
    const payload = {
      sub: 'usr-1',
      sessionToken: 'token-abc',
    };

    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@test.com',
      activo: true,
      bloqueado: false,
      sessionToken: 'token-xyz', // Diferente
      roles: [],
    });

    await expect(strategy.validate(payload as any)).rejects.toThrow(
      new UnauthorizedException(
        'Sesión inválida, cerrada o iniciada desde otro dispositivo',
      ),
    );
  });

  it('debe rechazar si usuario.sessionToken es null en BD (sesión cerrada por logout)', async () => {
    const payload = {
      sub: 'usr-1',
      sessionToken: 'token-abc',
    };

    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@test.com',
      activo: true,
      bloqueado: false,
      sessionToken: null, // Logout previo
      roles: [],
    });

    await expect(strategy.validate(payload as any)).rejects.toThrow(
      new UnauthorizedException(
        'Sesión inválida, cerrada o iniciada desde otro dispositivo',
      ),
    );
  });

  it('debe rechazar si el usuario está bloqueado administrativamente (bloqueado: true sin bloqueadoHasta)', async () => {
    const payload = {
      sub: 'usr-1',
      sessionToken: 'token-abc',
    };

    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'usr-1',
      activo: true,
      bloqueado: true,
      bloqueadoHasta: null,
      sessionToken: 'token-abc',
      roles: [],
    });

    await expect(strategy.validate(payload as any)).rejects.toThrow(
      new UnauthorizedException('Usuario bloqueado administrativamente'),
    );
  });

  it('debe rechazar si el usuario tiene bloqueo temporal activo (bloqueadoHasta > NOW)', async () => {
    const payload = {
      sub: 'usr-1',
      sessionToken: 'token-abc',
    };

    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min en el futuro

    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'usr-1',
      activo: true,
      bloqueado: true,
      bloqueadoHasta: futureDate,
      sessionToken: 'token-abc',
      roles: [],
    });

    await expect(strategy.validate(payload as any)).rejects.toThrow(
      new UnauthorizedException(
        'Usuario bloqueado temporalmente por intentos fallidos',
      ),
    );
  });

  it('debe permitir autenticación si el bloqueo temporal ya expiró (bloqueadoHasta <= NOW)', async () => {
    const payload = {
      sub: 'usr-1',
      sessionToken: 'token-abc',
    };

    const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 min en el pasado

    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@test.com',
      nombre: 'Juan',
      apellido: 'Perez',
      activo: true,
      bloqueado: true,
      bloqueadoHasta: pastDate,
      sessionToken: 'token-abc',
      roles: [{ rol: { nombre: 'OPERACIONES' } }],
    });

    const result = await strategy.validate(payload as any);
    expect(result.id).toBe('usr-1');
    expect(result.roles).toContain('OPERACIONES');
  });
});
