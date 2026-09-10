import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      usuario: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      empresa: { findUnique: jest.fn() },
      sucursal: { findFirst: jest.fn() },
      rol: { findMany: jest.fn() },
    };

    jwtService = {
      sign: jest.fn((payload, options) => `signed_jwt_${payload.sub || 'token'}`),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('debe generar accessToken y refreshToken al iniciar sesion', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@rental.com',
        nombre: 'Juan',
        apellido: 'Perez',
        empresaId: 'empresa-1',
        sucursalId: 'sucursal-1',
        roles: [{ rol: { nombre: 'ADMIN' } }],
        requiereCambioPassword: false,
      };

      prisma.usuario.update.mockResolvedValue({});

      const result = await service.login(mockUser);

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            sessionToken: expect.any(String),
          }),
        }),
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@rental.com');
    });
  });

  describe('refreshToken', () => {
    it('debe renovar exitosamente el accessToken y refreshToken si el token es valido', async () => {
      const mockSession = 'valid-session-uuid';
      jwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionToken: mockSession,
      });

      prisma.usuario.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@rental.com',
        nombre: 'Juan',
        activo: true,
        bloqueado: false,
        empresaId: 'empresa-1',
        sucursalId: 'sucursal-1',
        sessionToken: mockSession,
        roles: [{ rol: { nombre: 'ADMIN' } }],
        requiereCambioPassword: false,
      });

      const result = await service.refreshToken('valid_refresh_token_string');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('debe rechazar si la firma del token es invalida o expiro', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshToken('expired_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe rechazar si el sessionToken no coincide (sesion abierta en otro dispositivo)', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-123',
        sessionToken: 'old-session-token',
      });

      prisma.usuario.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@rental.com',
        activo: true,
        bloqueado: false,
        sessionToken: 'new-session-token-from-other-pc',
        roles: [],
      });

      await expect(service.refreshToken('some_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('rechaza el intento de registrar un usuario en otra empresa', async () => {
      const dto = {
        email: 'otro@rental.com', password: 'ClaveSegura1!', nombre: 'Otro', apellido: 'Usuario',
        empresaId: 'empresa-b', roles: ['ADMIN'],
      };

      await expect(service.register(dto, 'empresa-a')).rejects.toThrow(ForbiddenException);
      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });
  });
});
