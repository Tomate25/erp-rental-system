import { Controller, Get, Post, Body, Patch, Param, ParseUUIDPipe } from '@nestjs/common';
import { QuotationsService } from '../services/quotations.service';
import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  create(@Body() createDto: CreateQuotationDto) {
    return this.quotationsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.quotationsService.findAll();
  }

  @Get('public/:token')
  findByPublicToken(@Param('token') token: string) {
    return this.quotationsService.findByPublicToken(token);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: UpdateQuotationDto) {
    return this.quotationsService.update(id, updateDto);
  }

  @Post(':id/version')
  createNewVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationsService.createNewVersion(id);
  }
}
