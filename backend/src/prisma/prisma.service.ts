import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static pool: Pool;
  private static adapter: PrismaPg;

  constructor() {
    // Inicializar Pool de pg con la URL de conexión
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no está definida en las variables de entorno');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    // Llamar a super pasándole el adapter requerido en Prisma 7
    super({ adapter });

    PrismaService.pool = pool;
    PrismaService.adapter = adapter;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await PrismaService.pool.end();
  }
}
