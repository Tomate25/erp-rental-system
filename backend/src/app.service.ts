import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      sistema: 'ERP Rental Management System - BM Construcciones',
      version: '1.0.0',
      estado: 'online',
      salud: '/api/v1/health',
      portalWeb: 'http://localhost:5173',
      mensaje: 'API REST operativa y lista para conexiones.',
    };
  }
}

