import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RolesService, SYSTEM_ROLES } from './roles.service';

describe('RolesService Multi-Tenant & RBAC Protection', () => {
  let service: RolesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      rol: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      permiso: {
        findMany: jest.fn(),
      },
      rolPermiso: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      usuarioRol: {
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      auditoria: { create: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    service = new RolesService(prisma);
  });

  it('lista el catálogo de permisos en orden estable', async () => {
    const permisos = [{ id: 'permiso-1', codigo: 'AUDITORIA_VER' }];
    prisma.permiso.findMany.mockResolvedValue(permisos);

    await expect(service.findAllPermissions()).resolves.toEqual(permisos);
    expect(prisma.permiso.findMany).toHaveBeenCalledWith({
      orderBy: { codigo: 'asc' },
    });
  });

  describe('create (Multi-Tenant)', () => {
    it('convierte el nombre a mayúsculas y lo registra para el tenant específico', async () => {
      prisma.rol.findFirst.mockResolvedValue(null);
      prisma.rol.create.mockResolvedValue({
        id: 'rol-1',
        nombre: 'AUDITOR',
        descripcion: 'Auditor interno',
        empresaId: 'empresa-a',
      });

      const result = await service.create(
        { nombre: ' auditor ', descripcion: 'Auditor interno' },
        'empresa-a',
      );

      expect(prisma.rol.findFirst).toHaveBeenCalledWith({
        where: { nombre: 'AUDITOR', empresaId: 'empresa-a' },
      });
      expect(prisma.rol.create).toHaveBeenCalledWith({
        data: {
          nombre: 'AUDITOR',
          descripcion: 'Auditor interno',
          empresaId: 'empresa-a',
        },
      });
      expect(result.nombre).toBe('AUDITOR');
      expect(result.empresaId).toBe('empresa-a');
    });

    it('rechaza la creación si el nombre de rol ya existe dentro de la misma empresa', async () => {
      prisma.rol.findFirst.mockResolvedValue({
        id: 'rol-existente',
        nombre: 'AUDITOR',
        empresaId: 'empresa-a',
      });

      await expect(
        service.create({ nombre: 'auditor' }, 'empresa-a'),
      ).rejects.toThrow(ConflictException);
    });

    it('permite que dos empresas distintas creen roles con el mismo nombre (aislamiento multi-tenant)', async () => {
      prisma.rol.findFirst.mockResolvedValue(null);
      prisma.rol.create.mockResolvedValue({
        id: 'rol-b-1',
        nombre: 'AUDITOR',
        empresaId: 'empresa-b',
      });

      const result = await service.create({ nombre: 'auditor' }, 'empresa-b');
      expect(prisma.rol.findFirst).toHaveBeenCalledWith({
        where: { nombre: 'AUDITOR', empresaId: 'empresa-b' },
      });
      expect(result.empresaId).toBe('empresa-b');
    });

    it.each(SYSTEM_ROLES)(
      'rechaza crear un rol con nombre reservado del sistema %s en cualquier tenant',
      async (roleName) => {
        await expect(
          service.create({ nombre: roleName }, 'empresa-a'),
        ).rejects.toThrow(ConflictException);
        expect(prisma.rol.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('findAll (Multi-Tenant)', () => {
    it('filtra roles del sistema (globales) más roles propios de la empresa, excluyendo los de otros inquilinos', async () => {
      prisma.rol.findMany.mockResolvedValue([
        {
          id: 'rol-sys-1',
          nombre: 'ADMIN',
          descripcion: 'Administrador del sistema',
          empresaId: null,
          permisos: [],
          usuarios: [{ usuario: { empresaId: 'empresa-a' } }],
        },
        {
          id: 'rol-tenant-a',
          nombre: 'SUPERVISOR_OBRA',
          descripcion: 'Supervisor local',
          empresaId: 'empresa-a',
          permisos: [],
          usuarios: [],
        },
      ]);

      const result = await service.findAll('empresa-a');

      expect(prisma.rol.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ empresaId: null }, { empresaId: 'empresa-a' }],
          },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].esSistema).toBe(true);
      expect(result[1].esSistema).toBe(false);
      expect(result[1].empresaId).toBe('empresa-a');
    });
  });

  describe('findOne (Multi-Tenant IDOR prevention)', () => {
    it('permite consultar un rol global del sistema desde cualquier empresa', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 'rol-sys-1',
        nombre: 'GERENTE',
        descripcion: 'Gerente General',
        empresaId: null,
        permisos: [{ permiso: { id: 'p1', codigo: 'REPORT.EXPORT' } }],
      });

      const rol = await service.findOne('rol-sys-1', 'empresa-a');
      expect(rol.id).toBe('rol-sys-1');
      expect(rol.esSistema).toBe(true);
    });

    it('permite a una empresa consultar sus propios roles personalizados', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 'rol-cust-a',
        nombre: 'CAPATAZ',
        empresaId: 'empresa-a',
        permisos: [],
      });

      const rol = await service.findOne('rol-cust-a', 'empresa-a');
      expect(rol.id).toBe('rol-cust-a');
      expect(rol.empresaId).toBe('empresa-a');
    });

    it('bloquea con ForbiddenException si empresa A intenta consultar rol personalizado de empresa B (A->B)', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 'rol-cust-b',
        nombre: 'ANALISTA_B',
        empresaId: 'empresa-b',
        permisos: [],
      });

      await expect(service.findOne('rol-cust-b', 'empresa-a')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si el rol no existe', async () => {
      prisma.rol.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('rol-inexistente', 'empresa-a'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePermissions (Multi-Tenant Isolation & System Immutability)', () => {
    it.each(SYSTEM_ROLES)(
      'impide modificar los permisos de roles globales del sistema: %s',
      async (roleName) => {
        prisma.rol.findUnique.mockResolvedValue({
          id: `rol-${roleName}`,
          nombre: roleName,
          empresaId: null,
          permisos: [],
        });

        await expect(
          service.updatePermissions(
            `rol-${roleName}`,
            { permisoIds: ['p1'] },
            'empresa-a',
          ),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.rolPermiso.deleteMany).not.toHaveBeenCalled();
      },
    );

    it('bloquea con ForbiddenException si empresa A intenta modificar permisos de un rol de empresa B (A->B)', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 'rol-custom-b',
        nombre: 'ROL_EMPRESA_B',
        empresaId: 'empresa-b',
        permisos: [],
      });

      await expect(
        service.updatePermissions(
          'rol-custom-b',
          { permisoIds: ['p1'] },
          'empresa-a',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.rolPermiso.deleteMany).not.toHaveBeenCalled();
    });

    it('permite actualizar permisos para roles personalizados propios de la empresa', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 'rol-custom-a',
        nombre: 'SUPERVISOR_CALIDAD',
        empresaId: 'empresa-a',
        permisos: [],
      });
      prisma.permiso.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      const res = await service.updatePermissions(
        'rol-custom-a',
        { permisoIds: ['p1', 'p2'] },
        'empresa-a',
      );

      expect(prisma.rolPermiso.deleteMany).toHaveBeenCalledWith({
        where: { rolId: 'rol-custom-a' },
      });
      expect(prisma.rolPermiso.createMany).toHaveBeenCalledWith({
        data: [
          { rolId: 'rol-custom-a', permisoId: 'p1' },
          { rolId: 'rol-custom-a', permisoId: 'p2' },
        ],
      });
      expect(res.success).toBe(true);
    });
  });

  describe('remove (Multi-Tenant Isolation & System Protection)', () => {
    it.each(SYSTEM_ROLES)(
      'impide eliminar el rol del sistema %s',
      async (roleName) => {
        prisma.rol.findUnique.mockResolvedValue({
          id: `id-${roleName}`,
          nombre: roleName,
          empresaId: null,
          permisos: [],
        });

        await expect(
          service.remove(`id-${roleName}`, 'empresa-a'),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.rol.delete).not.toHaveBeenCalled();
      },
    );

    it('bloquea con ForbiddenException si empresa A intenta eliminar un rol de empresa B (A->B)', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 'rol-custom-b',
        nombre: 'ROL_DE_B',
        empresaId: 'empresa-b',
        permisos: [],
      });

      await expect(service.remove('rol-custom-b', 'empresa-a')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.rol.delete).not.toHaveBeenCalled();
    });

    it('impide eliminar un rol personalizado si tiene usuarios asociados', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 'rol-custom-a',
        nombre: 'ASISTENTE_OBRA',
        empresaId: 'empresa-a',
        permisos: [],
      });
      prisma.usuarioRol.count.mockResolvedValue(2);

      await expect(service.remove('rol-custom-a', 'empresa-a')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.usuarioRol.count).toHaveBeenCalledWith({
        where: { rolId: 'rol-custom-a' },
      });
      expect(prisma.rol.delete).not.toHaveBeenCalled();
    });

    it('permite eliminar un rol personalizado propio si no tiene usuarios asignados', async () => {
      prisma.rol.findUnique.mockResolvedValue({
        id: 'rol-custom-a',
        nombre: 'ROL_OBSOLETO',
        empresaId: 'empresa-a',
        permisos: [],
      });
      prisma.usuarioRol.count.mockResolvedValue(0);

      const res = await service.remove('rol-custom-a', 'empresa-a');

      expect(prisma.rol.delete).toHaveBeenCalledWith({
        where: { id: 'rol-custom-a' },
      });
      expect(res.success).toBe(true);
    });
  });
});
