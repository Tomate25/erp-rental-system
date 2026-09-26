import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1 (GET) - debe retornar información del sistema y estado online', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty(
          'sistema',
          'ERP Rental Management System - BM Construcciones',
        );
        expect(res.body).toHaveProperty('version', '1.0.0');
        expect(res.body).toHaveProperty('estado', 'online');
        expect(res.body).toHaveProperty('salud', '/api/v1/health');
      });
  });

  it('/api/v1/health (GET) - debe retornar el estado de salud de la aplicación y base de datos', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(
        (res: { body: { status: string; database?: { status: string } } }) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('database');
          expect(res.body.database).toHaveProperty('status', 'healthy');
        },
      );
  });
});
