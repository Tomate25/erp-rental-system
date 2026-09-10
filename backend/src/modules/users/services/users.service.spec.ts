import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { validate } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UsersService } from './users.service';

describe('UsersService security', () => {
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
        update: jest.fn(),
      },
    };
    service = new UsersService(prisma as unknown as PrismaService);
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

  it('rechaza el cambio cuando la contraseña actual es incorrecta', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      password: currentPasswordHash,
    });

    await expect(
      service.forceChangePassword('usuario-a', 'Incorrecta1!', 'NuevaClave2@'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('actualiza la contraseña después de verificar la actual', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      password: currentPasswordHash,
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

  it('exige complejidad mínima en la nueva contraseña', async () => {
    const dto = Object.assign(new ChangePasswordDto(), {
      oldPassword: 'Temporal1!',
      newPassword: 'debil123',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'newPassword')).toBe(true);
  });
});
