import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('reservations')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION', 'INVENTARIO', 'MANTENIMIENTO')
  async getReservations(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    // defaults to current month if not provided
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

    const data = await this.availabilityService.getReservations(start, end, empresaId);
    return {
      success: true,
      data
    };
  }
}
