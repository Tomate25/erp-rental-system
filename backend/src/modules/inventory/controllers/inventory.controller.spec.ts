import { ForbiddenException } from '@nestjs/common';
import { EstadoEquipo } from '@prisma/client';
import { InventoryController } from './inventory.controller';
import { InventoryService } from '../services/inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let inventoryService: { update: jest.Mock };

  beforeEach(() => {
    inventoryService = {
      update: jest.fn().mockResolvedValue({ id: 'equipo-a' }),
    };
    controller = new InventoryController(
      inventoryService as unknown as InventoryService,
    );
  });

  it.each(['MANTENIMIENTO', 'OPERACIONES', undefined])(
    'responde 403 si el rol %s intenta asignar BAJA',
    async (role) => {
      await expect(
        controller.update(
          'equipo-a',
          { estado: EstadoEquipo.BAJA },
          'empresa-a',
          'usuario-a',
          role ? [role] : undefined,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(inventoryService.update).not.toHaveBeenCalled();
    },
  );

  it.each(['ADMIN', 'GERENTE'])('permite que %s asigne BAJA', async (role) => {
    await expect(
      controller.update(
        'equipo-a',
        { estado: EstadoEquipo.BAJA },
        'empresa-a',
        'usuario-a',
        [role],
      ),
    ).resolves.toMatchObject({ success: true });

    expect(inventoryService.update).toHaveBeenCalledWith(
      'equipo-a',
      { estado: EstadoEquipo.BAJA },
      'empresa-a',
      'usuario-a',
    );
  });

  it('mantiene las actualizaciones distintas de BAJA para MANTENIMIENTO', async () => {
    await expect(
      controller.update(
        'equipo-a',
        { estado: EstadoEquipo.DISPONIBLE },
        'empresa-a',
        'usuario-a',
        ['MANTENIMIENTO'],
      ),
    ).resolves.toMatchObject({ success: true });

    expect(inventoryService.update).toHaveBeenCalledTimes(1);
  });
});
