import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, DUMMY_ARGON2_HASH } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('mocked_hash'),
  verify: jest.fn().mockResolvedValue(false),
}));

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
      auditoria: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );

    jwtService = {
      sign: jest.fn(
        (payload, _options) => `signed_jwt_${payload.sub || 'token'}`,
      ),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        if (key === 'AUTH_MAX_FAILED_ATTEMPTS') return '5';
        if (key === 'AUTH_LOCKOUT_MINUTES') return '15';
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

  describe('validateUser', () => {
    it('retorna respuesta uniforme (Credenciales inválidas) si el email no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser({
          email: 'no_existe@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('retorna respuesta uniforme (Credenciales inválidas) si el usuario está inactivo', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u-inactivo',
        email: 'inactivo@test.com',
        activo: false,
        roles: [],
      });

      await expect(
        service.validateUser({
          email: 'inactivo@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('retorna respuesta uniforme si el usuario tiene bloqueo permanente de administrador', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u-bloqueado',
        email: 'bloqueado@test.com',
        activo: true,
        bloqueado: true,
        bloqueadoHasta: null,
        roles: [],
      });

      await expect(
        service.validateUser({
          email: 'bloqueado@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('retorna respuesta uniforme si la cuenta está en ventana activa de bloqueo temporal', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u-temporal',
        email: 'temp@test.com',
        activo: true,
        bloqueado: true,
        bloqueadoHasta: new Date(Date.now() + 10 * 60 * 1000), // En 10 minutos
        roles: [],
      });

      await expect(
        service.validateUser({
          email: 'temp@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('incrementa intentos fallidos ante contraseña incorrecta con respuesta uniforme', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'user@test.com',
        password: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
        activo: true,
        bloqueado: false,
        intentosFallidos: 2,
        roles: [],
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      prisma.usuario.update.mockResolvedValue({});

      await expect(
        service.validateUser({
          email: 'user@test.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: expect.objectContaining({
            intentosFallidos: 3,
            bloqueado: false,
            bloqueadoHasta: null,
          }),
        }),
      );
    });

    it('aplica bloqueo temporal automático al alcanzar el límite (5 intentos fallidos)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'user@test.com',
        password: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
        activo: true,
        bloqueado: false,
        intentosFallidos: 4,
        roles: [],
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      prisma.usuario.update.mockResolvedValue({});

      await expect(
        service.validateUser({
          email: 'user@test.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: expect.objectContaining({
            intentosFallidos: 5,
            bloqueado: true,
            bloqueadoHasta: expect.any(Date),
          }),
        }),
      );
    });

    it('permite autenticar y resetea bloqueo tras expirar la ventana temporal', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'user@test.com',
        password: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
        activo: true,
        bloqueado: true,
        bloqueadoHasta: new Date(Date.now() - 5000), // Expiró hace 5 segundos
        intentosFallidos: 5,
        sessionToken: 'secret-uuid-session',
        roles: [{ rol: { nombre: 'ADMIN' } }],
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.usuario.update.mockResolvedValue({});

      const user = await service.validateUser({
        email: 'user@test.com',
        password: 'CorrectPassword!',
      });

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: {
            intentosFallidos: 0,
            bloqueado: false,
            bloqueadoHasta: null,
          },
        }),
      );

      // Omite password y sessionToken en el resultado
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('sessionToken');
      expect(user.email).toBe('user@test.com');
    });
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
      expect(result.user).not.toHaveProperty('sessionToken');
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
        email: 'otro@rental.com',
        password: 'ClaveSegura1!',
        nombre: 'Otro',
        apellido: 'Usuario',
        empresaId: 'empresa-b',
        roles: ['ADMIN'],
      };

      await expect(service.register(dto, 'empresa-a')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('filtra roles por empresaId y rechaza si se especifica un rol de otra empresa (A->B)', async () => {
      const dto = {
        email: 'nuevo@empresa-a.com',
        password: 'Password123!',
        nombre: 'Nuevo',
        apellido: 'Usuario',
        empresaId: 'empresa-a',
        roles: ['ROL_DE_EMPRESA_B'],
      };

      prisma.empresa.findUnique.mockResolvedValue({ id: 'empresa-a' });
      prisma.usuario.findUnique.mockResolvedValue(null);
      // Simula que la búsqueda filtrada por OR: [{ empresaId: null }, { empresaId: 'empresa-a' }]
      // no encuentra el rol de la empresa B
      prisma.rol.findMany.mockResolvedValue([]);

      await expect(service.register(dto, 'empresa-a')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.rol.findMany).toHaveBeenCalledWith({
        where: {
          nombre: { in: ['ROL_DE_EMPRESA_B'] },
          OR: [{ empresaId: null }, { empresaId: 'empresa-a' }],
        },
      });
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('asigna correctamente roles del sistema o de la propia empresa al registrar usuario', async () => {
      const dto = {
        email: 'nuevo@empresa-a.com',
        password: 'Password123!',
        nombre: 'Nuevo',
        apellido: 'Usuario',
        empresaId: 'empresa-a',
        roles: ['ADMIN'],
      };

      prisma.empresa.findUnique.mockResolvedValue({ id: 'empresa-a' });
      prisma.usuario.findUnique.mockResolvedValue(null);
      prisma.rol.findMany.mockResolvedValue([
        { id: 'rol-admin-sys', nombre: 'ADMIN' },
      ]);
      prisma.usuario.create.mockResolvedValue({
        id: 'usr-1',
        email: dto.email,
        nombre: dto.nombre,
        apellido: dto.apellido,
        empresaId: dto.empresaId,
        roles: [{ rol: { id: 'rol-admin-sys', nombre: 'ADMIN' } }],
      });

      const res = await service.register(dto, 'empresa-a');
      expect(res.email).toBe(dto.email);
    });
  });

  describe('DUMMY_ARGON2_HASH', () => {
    it('es un hash Argon2id válido que no arroja error de formato y verifica retornando false', async () => {
      const actualArgon2 = jest.requireActual('argon2');
      const result = await actualArgon2.verify(
        DUMMY_ARGON2_HASH,
        'cualquier_password',
      );
      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('invalida sessionToken en base de datos si se proporciona userId', async () => {
      prisma.usuario.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      await service.logout('usr-1');
      expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
        where: { id: 'usr-1' },
        data: { sessionToken: null },
      });
    });

    it('verifica criptográficamente el token usando JWT_ACCESS_SECRET / JWT_REFRESH_SECRET e invalida solo la sesión específica (scoped)', async () => {
      jwtService.verify = jest.fn().mockImplementation((token, options) => {
        expect(options.secret).toBeDefined();
        return { sub: 'usr-verified', sessionToken: 'ses-token-active' };
      });
      prisma.usuario.updateMany = jest.fn().mockResolvedValue({ count: 1 });

      await service.logout(undefined, 'valid-signed-token');

      // Verifica que se haya usado la configuración de secretos
      expect(configService.get).toHaveBeenCalledWith('JWT_ACCESS_SECRET');
      expect(jwtService.verify).toHaveBeenCalled();
      // Verificación de atomicidad por sesión: solo anula el sessionToken del payload
      expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
        where: { id: 'usr-verified', sessionToken: 'ses-token-active' },
        data: { sessionToken: null },
      });
    });

    it('prueba negativa: un token válido con sessionToken antiguo NO invalida una sesión más reciente', async () => {
      // Simular que el usuario tiene ses-token-nueva en DB, pero el token deslogueado trae ses-token-vieja
      jwtService.verify = jest.fn().mockReturnValue({
        sub: 'usr-verified',
        sessionToken: 'ses-token-vieja',
      });
      prisma.usuario.updateMany = jest
        .fn()
        .mockImplementation(async ({ where }) => {
          // En PostgreSQL esto coincidiría con 0 filas porque la DB tiene ses-token-nueva
          if (where.sessionToken === 'ses-token-vieja') {
            return { count: 0 };
          }
          return { count: 1 };
        });

      await service.logout(undefined, 'valid-token-old-session');

      expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
        where: { id: 'usr-verified', sessionToken: 'ses-token-vieja' },
        data: { sessionToken: null },
      });
    });

    it('rechaza con UnauthorizedException y NO invalida sesiones si el token es forjado o inválido', async () => {
      jwtService.verify = jest.fn().mockImplementation(() => {
        throw new Error('invalid signature');
      });
      prisma.usuario.updateMany = jest.fn();

      await expect(
        service.logout(undefined, 'forged-token-alg-none'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    });

    it('rechaza si el token verificado no contiene claim sub', async () => {
      jwtService.verify = jest.fn().mockReturnValue({ sessionToken: 'ses-1' }); // sin sub
      prisma.usuario.updateMany = jest.fn();

      await expect(
        service.logout(undefined, 'token-without-sub'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    });

    it('rechaza si el token verificado no contiene claim sessionToken', async () => {
      jwtService.verify = jest.fn().mockReturnValue({ sub: 'usr-1' }); // sin sessionToken
      prisma.usuario.updateMany = jest.fn();

      await expect(
        service.logout(undefined, 'token-without-session-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    });
  });
});
