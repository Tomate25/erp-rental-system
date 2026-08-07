import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto, empresaId: string) {
    const { nombre, emailFacturacion, rfc } = createClientDto;

    // Verificar duplicidad de RFC en la misma empresa si se proporciona
    if (rfc) {
      const clientExists = await this.prisma.cliente.findFirst({
        where: {
          rfc,
          empresaId,
        },
      });
      if (clientExists) {
        throw new BadRequestException('Ya existe un cliente con este RFC registrado en tu empresa');
      }
    }

    return this.prisma.cliente.create({
      data: {
        ...createClientDto,
        empresaId,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.cliente.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'desc' },
      include: {
        contactos: true, // Incluye los contactos relacionados
      },
    });
  }

  async findOne(id: string, empresaId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id,
        empresaId,
      },
      include: {
        contactos: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException(`No se encontró el cliente con ID: ${id}`);
    }

    return cliente;
  }

  async update(id: string, updateClientDto: UpdateClientDto, empresaId: string) {
    // Verificar que exista y pertenezca a la empresa
    await this.findOne(id, empresaId);

    return this.prisma.cliente.update({
      where: { id },
      data: updateClientDto,
    });
  }

  async remove(id: string, empresaId: string) {
    // Verificar que exista y pertenezca a la empresa
    await this.findOne(id, empresaId);

    return this.prisma.cliente.delete({
      where: { id },
    });
  }
}
