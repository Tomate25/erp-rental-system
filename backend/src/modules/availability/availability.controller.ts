import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('reservations')
  async getReservations(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    // defaults to current month if not provided
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

    const data = await this.availabilityService.getReservations(start, end);
    return {
      success: true,
      data
    };
  }
}
