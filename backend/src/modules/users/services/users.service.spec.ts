import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { validate } from 'class-validator';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UsersService } from './users.service';

describe('UsersService security & multi-tenant isolation', () => {
  let prisma: any;
  let service: UsersService;
  let currentPasswordHash: string;

  beforeAll(async () => {
    currentPasswordHash = await argon2.hash('Temporal1!');
  });

  beforeEach(() => {
    prisma = {
      usuario: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      rol: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn((args) => prisma.rol.findUnique(args)),
      },
      usuarioRol: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      sucursal: {
        findFirst: jest.fn(),
      },
      auditoria: { create: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };
    service = new UsersService(prisma);
  });

  it('omite password y sessionToken al listar usuarios', async () => {
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 'usuario-a',
        password: currentPasswordHash,
        sessionToken: 'token-secreto',
        roles: [
          {
            rol: { id: 'rol-a', nombre: 'ADMIN', descripcion: 'Administrador' },
          },
        ],
      },
    ]);

    const [usuario] = await service.findAll('empresa-a');

    expect(usuario).not.toHaveProperty('password');
    expect(usuario).not.toHaveProperty('sessionToken');
  });

  it('obtiene un usuario del tenant sin exponer credenciales', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      id: 'usuario-a',
      empresaId: 'empresa-a',
      password: currentPasswordHash,
      sessionToken: 'token-secreto',
      roles: [{ rol: { id: 'rol-a', nombre: 'ADMIN' } }],
      sucursal: null,
    });

    const usuario = await service.findOne('usuario-a', 'empresa-a');

    expect(usuario).not.toHaveProperty('password');
    expect(usuario).not.toHaveProperty('sessionToken');
    expect(usuario.roles).toEqual([{ id: 'rol-a', nombre: 'ADMIN' }]);
  });

  it('rechaza el cambio cuando la contraseña actual es incorrecta', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      password: currentPasswordHash,
      empresaId: 'empresa-a',
    });

    await expect(
      service.forceChangePassword('usuario-a', 'Incorrecta1!', 'NuevaClave2@'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('actualiza la contraseña después de verificar la actual', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      password: currentPasswordHash,
      empresaId: 'empresa-a',
    });
    prisma.usuario.update.mockResolvedValue({});

    await service.forceChangePassword(
      'usuario-a',
      'Temporal1!',
      'NuevaClave2@',
    );

    const passwordHash = prisma.usuario.update.mock.calls[0][0].data.password;
    await expect(argon2.verify(passwordHash, 'NuevaClave2@')).resolves.toBe(
      true,
    );
  });

  it('rechaza cambiar contraseña si el usuario está bloqueado administrativamente', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce({
      password: currentPasswordHash,
      bloqueado: true,
      bloqueadoHasta: null,
    });

    await expect(
      service.forceChangePassword('usuario-a', 'Temporal1!', 'NuevaClave2@'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('exige complejidad mínima en la nueva contraseña', async () => {
    const dto = Object.assign(new ChangePasswordDto(), {
      oldPassword: 'Temporal1!',
      newPassword: 'debil123',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'newPassword')).toBe(true);
  });

  describe('Multi-tenant isolation & IDOR prevention', () => {
    it('rechaza consultar o actualizar roles de un usuario que pertenece a otra empresa (anti-IDOR)', async () => {
      // Simula que el usuario no existe en la empresa solicitante
      prisma.usuario.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRoles(
          'usuario-otra-empresa',
          { rolIds: ['rol-1'] },
          'empresa-a',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza desactivar a un usuario perteneciente a otra empresa (anti-IDOR)', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleStatus(
          'usuario-otra-empresa',
          'admin-actual',
          'empresa-a',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza que un usuario se desactive a sí mismo', async () => {
      await expect(
        service.toggleStatus(
          'mismo-usuario-id',
          'mismo-usuario-id',
          'empresa-a',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('impide desactivar al único administrador activo de la empresa', async () => {
      const adminRole = { id: 'rol-admin-id', nombre: 'ADMIN' };
      prisma.usuario.findFirst.mockResolvedValue({
        id: 'admin-unico',
        activo: true,
        roles: [{ id: 'rol-admin-id', nombre: 'ADMIN' }],
      });
      prisma.rol.findUnique.mockResolvedValue(adminRole);
      // Solo 1 admin activo
      prisma.usuario.count.mockResolvedValue(1);

      await expect(
        service.toggleStatus('admin-unico', 'otro-operador', 'empresa-a'),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite desactivar un administrador si queda otro activo en la empresa', async () => {
      const adminRole = { id: 'rol-admin-id', nombre: 'ADMIN' };
      prisma.usuario.findFirst.mockResolvedValue({
        id: 'admin-secundario',
        activo: true,
        roles: [{ id: 'rol-admin-id', nombre: 'ADMIN' }],
      });
      prisma.rol.findUnique.mockResolvedValue(adminRole);
      // Quedan 2 admins activos
      prisma.usuario.count.mockResolvedValue(2);
      prisma.usuario.update.mockResolvedValue({
        id: 'admin-secundario',
        activo: false,
      });

      const res = await service.toggleStatus(
        'admin-secundario',
        'admin-principal',
        'empresa-a',
      );
      expect(res.activo).toBe(false);
    });

    it('impide remover el rol ADMIN al único administrador activo de la empresa', async () => {
      const adminRole = { id: 'rol-admin-id', nombre: 'ADMIN' };
      const rolComercial = { id: 'rol-comercial-id', nombre: 'COMERCIAL' };

      prisma.usuario.findFirst.mockResolvedValue({
        id: 'admin-1',
        activo: true,
        roles: [{ id: 'rol-admin-id', nombre: 'ADMIN' }],
      });
      prisma.rol.findMany.mockResolvedValue([rolComercial]);
      prisma.rol.findUnique.mockResolvedValue(adminRole);
      // Solo 1 admin activo en la empresa
      prisma.usuario.count.mockResolvedValue(1);

      await expect(
        service.updateRoles(
          'admin-1',
          { rolIds: ['rol-comercial-id'] },
          'empresa-a',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza desbloquear y resetear contraseña de usuario de otra empresa', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);

      await expect(
        service.unlockAndResetPassword('usuario-otra-empresa', 'empresa-a'),
      ).rejects.toThrow(NotFoundException);
    });

    it('desbloquea usuario y genera contraseña temporal para usuario legítimo de la empresa', async () => {
      prisma.usuario.findFirst.mockResolvedValue({
        id: 'usuario-legitimo',
        empresaId: 'empresa-a',
      });
      prisma.usuario.update.mockResolvedValue({});

      const res = await service.unlockAndResetPassword(
        'usuario-legitimo',
        'empresa-a',
      );
      expect(res.success).toBe(true);
      expect(res.tempPassword).toMatch(/^TEMP-[A-Z0-9]{6}$/);
      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usuario-legitimo' },
          data: expect.objectContaining({
            bloqueado: false,
            intentosFallidos: 0,
            requiereCambioPassword: true,
          }),
        }),
      );
    });

    it('ejecuta bloqueo pesimista FOR UPDATE en updateRoles y toggleStatus para serializar transacciones', async () => {
      const adminRole = { id: 'rol-admin-id', nombre: 'ADMIN' };
      prisma.usuario.findFirst.mockResolvedValue({
        id: 'admin-1',
        activo: true,
        roles: [{ id: 'rol-admin-id', nombre: 'ADMIN' }],
      });
      prisma.rol.findMany.mockResolvedValue([{ id: 'rol-2' }]);
      prisma.rol.findUnique.mockResolvedValue(adminRole);
      prisma.usuario.count.mockResolvedValue(2);
      prisma.usuarioRol.deleteMany.mockResolvedValue({});
      prisma.usuarioRol.createMany.mockResolvedValue({});

      await service.updateRoles('admin-1', { rolIds: ['rol-2'] }, 'empresa-a');
      expect(prisma.$executeRaw).toHaveBeenCalled();

      prisma.$executeRaw.mockClear();
      prisma.usuario.update.mockResolvedValue({ id: 'admin-1', activo: false });

      await service.toggleStatus('admin-1', 'admin-2', 'empresa-a');
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('en dos mutaciones concurrentes para revocar ADMIN, la serialización atómica rechaza la segunda que dejaría 0 administradores', async () => {
      const adminRole = { id: 'rol-admin-id', nombre: 'ADMIN' };
      const rolComercial = { id: 'rol-comercial-id', nombre: 'COMERCIAL' };

      // Simular dos transacciones en paralelo
      let remainingAdmins = 2;

      // Mock dinámico de count que refleja la mutación de la primera transacción
      prisma.usuario.count.mockImplementation(async () => remainingAdmins);
      prisma.usuario.findFirst.mockResolvedValue({
        id: 'admin-target',
        activo: true,
        roles: [{ id: 'rol-admin-id', nombre: 'ADMIN' }],
      });
      prisma.rol.findMany.mockResolvedValue([rolComercial]);
      prisma.rol.findUnique.mockResolvedValue(adminRole);
      prisma.usuarioRol.deleteMany.mockResolvedValue({});
      prisma.usuarioRol.createMany.mockImplementation(async () => {
        remainingAdmins -= 1; // Primera transacción reduce a 1 el conteo de administradores
      });

      // Transacción 1: Exitosa (queda 1 administrador)
      const res1 = await service.updateRoles(
        'admin-target',
        { rolIds: ['rol-comercial-id'] },
        'empresa-a',
      );
      expect(res1.success).toBe(true);
      expect(remainingAdmins).toBe(1);

      // Transacción 2: Al ejecutarse concurrentemente tras la primera, lee remainingAdmins = 1 y es rechazada
      await expect(
        service.updateRoles(
          'admin-target',
          { rolIds: ['rol-comercial-id'] },
          'empresa-a',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza crear un usuario si se intenta asignar un rol de otra empresa (A->B)', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      // Simula que la búsqueda filtrada por OR: [{ empresaId: null }, { empresaId: 'empresa-a' }]
      // no encuentra el rol porque pertenece a empresa-b
      prisma.rol.findMany.mockResolvedValue([]);

      const dto = {
        email: 'nuevo@empresa-a.com',
        password: 'Password123!',
        nombre: 'Nuevo',
        apellido: 'Usuario',
        roles: ['rol-de-empresa-b'],
      };

      await expect(service.create(dto as any, 'empresa-a')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.rol.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['rol-de-empresa-b'] },
          OR: [{ empresaId: null }, { empresaId: 'empresa-a' }],
        },
      });
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('rechaza actualizar roles si se intenta asignar un rol perteneciente a otra empresa (A->B)', async () => {
      prisma.usuario.findFirst.mockResolvedValue({
        id: 'usuario-a',
        empresaId: 'empresa-a',
        roles: [],
      });
      // La búsqueda filtrada devuelve vacío para el rol de empresa-b
      prisma.rol.findMany.mockResolvedValue([]);

      await expect(
        service.updateRoles(
          'usuario-a',
          { rolIds: ['rol-de-empresa-b'] },
          'empresa-a',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.usuarioRol.createMany).not.toHaveBeenCalled();
    });
  });
});
