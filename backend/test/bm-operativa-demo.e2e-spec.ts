import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QuotationsService } from '../src/modules/quotations/services/quotations.service';
import { ContractsService } from '../src/modules/contracts/services/contracts.service';
import { OperationsService } from '../src/modules/operations/services/operations.service';
import { MaintenanceService } from '../src/modules/maintenance/services/maintenance.service';
import { InventoryService } from '../src/modules/inventory/services/inventory.service';
import { BillingService } from '../src/modules/billing/billing.service';
import {
  EstadoEquipo,
  EstadoMantenimiento,
  TipoControlEquipo,
  TipoMantenimiento,
} from '@prisma/client';

describe('Prueba Punta a Punta - Operativa BM Demo (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let quotationsService: QuotationsService;
  let contractsService: ContractsService;
  let operationsService: OperationsService;
  let maintenanceService: MaintenanceService;
  let inventoryService: InventoryService;
  let billingService: BillingService;

  let empresaId: string;
  let sucursalId: string;
  let usuarioId: string;
  let clienteId: string;
  let categoriaId: string;

  let equipoA: any;
  let equipoB: any;
  let cotizacionId: string;
  let contratoId: string;
  let despachoId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);
    quotationsService = app.get(QuotationsService);
    contractsService = app.get(ContractsService);
    operationsService = app.get(OperationsService);
    maintenanceService = app.get(MaintenanceService);
    inventoryService = app.get(InventoryService);
    billingService = app.get(BillingService);

    // Obtener o crear contexto base para el test
    let usuario = await prisma.usuario.findFirst({
      include: { empresa: { include: { sucursales: true } } },
    });
    if (!usuario) {
      let empresa = await prisma.empresa.findFirst({
        include: { sucursales: true },
      });
      if (!empresa) {
        empresa = await prisma.empresa.create({
          data: {
            nombre: 'BM Construcciones S.A.',
            identificacionFiscal: 'J0310000000000',
            telefono: '2222-1111',
            email: 'admin@bmconstrucciones.com',
            sucursales: {
              create: {
                nombre: 'Sucursal Central Demo',
                codigo: 'SUC-01',
                direccion: 'Managua',
              },
            },
          },
          include: { sucursales: true },
        });
      }
      usuario = await prisma.usuario.create({
        data: {
          empresaId: empresa.id,
          sucursalId: empresa.sucursales[0]?.id,
          email: `demo-admin-${Date.now()}@bmconstrucciones.com`,
          password: 'PasswordHash123!',
          nombre: 'Admin',
          apellido: 'Demo',
        },
        include: { empresa: { include: { sucursales: true } } },
      });
    }

    empresaId = usuario.empresaId;
    usuarioId = usuario.id;
    const sucursal =
      usuario.empresa.sucursales[0] ||
      (await prisma.sucursal.findFirst({ where: { empresaId } }));
    if (!sucursal) throw new Error('No se encontró sucursal para pruebas');
    sucursalId = sucursal.id;

    let cliente = await prisma.cliente.findFirst({ where: { empresaId } });
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          empresaId,
          nombre: 'Constructora Demo BM S.A.',
          identificacion: 'J0310000000001',
          telefono: '2222-3333',
          email: 'contacto@constructorademo.com',
          direccion: 'Managua, Nicaragua',
        },
      });
    }
    clienteId = cliente.id;

    let categoria = await prisma.categoria.findFirst();
    if (!categoria) {
      categoria = await prisma.categoria.create({
        data: {
          nombre: 'Maquinaria y Andamios Demo',
        },
      });
    }
    categoriaId = categoria.id;

    let marca = await prisma.marca.findFirst();
    if (!marca) {
      marca = await prisma.marca.create({
        data: { nombre: 'Marca Demo BM' },
      });
    }
    const marcaId = marca.id;

    const timestamp = Date.now();

    // 1. Crear Equipo Serializado A (horómetro inicial 100, tieneHorometro true, 1 unidad)
    equipoA = await inventoryService.create(
      {
        codigo: `DEMO-A-${timestamp}`,
        modelo: 'Generador 10kVA Serializado Demo A',
        sucursalId,
        categoriaId,
        marcaId,
        tipoControl: TipoControlEquipo.SERIALIZADO,
        tieneHorometro: true,
        horometro: 100.0,
        cantidadTotal: 1,
        cantidadDisponible: 1,
        estado: EstadoEquipo.DISPONIBLE,
        precioRentaDia: 80.0,
        precioRentaHora: 15.0,
        numeroSerie: `SN-GEN-${timestamp}`,
      } as any,
      empresaId,
      usuarioId,
    );

    // 2. Crear Lote POR_CANTIDAD B (10 unidades, sin horómetro)
    equipoB = await inventoryService.create(
      {
        codigo: `DEMO-B-${timestamp}`,
        modelo: 'Lote Andamios Estándar Demo B',
        sucursalId,
        categoriaId,
        marcaId,
        tipoControl: TipoControlEquipo.POR_CANTIDAD,
        tieneHorometro: false,
        horometro: 0.0,
        cantidadTotal: 10,
        cantidadDisponible: 10,
        estado: EstadoEquipo.DISPONIBLE,
        precioRentaDia: 10.0,
      } as any,
      empresaId,
      usuarioId,
    );
  }, 30000);

  afterAll(async () => {
    // Limpieza de datos creados en el test
    try {
      const eqIds = [equipoA?.id, equipoB?.id].filter(Boolean);
      if (contratoId) {
        await prisma.liquidacionRetorno.deleteMany({ where: { contratoId } });
        await prisma.corteFacturacion.deleteMany({ where: { contratoId } });
        await prisma.mantenimiento.deleteMany({ where: { equipoId: { in: eqIds } } });
        await prisma.inspeccionDano.deleteMany({ where: { detalleDevolucion: { devolucion: { contratoId } } } });
        await prisma.detalleDevolucion.deleteMany({ where: { devolucion: { contratoId } } });
        await prisma.devolucion.deleteMany({ where: { contratoId } });
        await prisma.detalleDespacho.deleteMany({ where: { despacho: { contratoId } } });
        await prisma.despacho.deleteMany({ where: { contratoId } });
        await prisma.reserva.deleteMany({ where: { contratoId } });
        await prisma.detalleContrato.deleteMany({ where: { contratoId } });
        await prisma.contrato.deleteMany({ where: { id: contratoId } });
      }
      if (cotizacionId) {
        await prisma.detalleCotizacion.deleteMany({ where: { cotizacionId } });
        await prisma.cotizacion.deleteMany({ where: { id: cotizacionId } });
      }
      if (eqIds.length > 0) {
        await prisma.mantenimiento.deleteMany({ where: { equipoId: { in: eqIds } } });
        await prisma.inspeccionDano.deleteMany({ where: { detalleDevolucion: { equipoId: { in: eqIds } } } });
        await prisma.detalleDevolucion.deleteMany({ where: { equipoId: { in: eqIds } } });
        await prisma.detalleDespacho.deleteMany({ where: { equipoId: { in: eqIds } } });
        await prisma.reserva.deleteMany({ where: { equipoId: { in: eqIds } } });
        await prisma.detalleContrato.deleteMany({ where: { equipoId: { in: eqIds } } });
        await prisma.detalleCotizacion.deleteMany({ where: { equipoId: { in: eqIds } } });
        await prisma.lecturaHorometro.deleteMany({ where: { equipoId: { in: eqIds } } });
        await prisma.equipo.deleteMany({ where: { id: { in: eqIds } } });
      }
    } catch (e) {
      console.warn('Error durante la limpieza post-test:', e);
    }

    if (app) {
      await app.close();
    }
  });

  it('1. Cotizar A + 4 de B → revisar → enviar → aceptar', async () => {
    const cotizacion = await quotationsService.create(
      {
        clienteId,
        sucursalId,
        vigenciaDias: 15,
        proyecto: 'Proyecto Demo BM Edificio Norte',
        items: [
          {
            equipoId: equipoA.id,
            descripcion: equipoA.modelo,
            cantidad: 1,
            dias: 30,
            precioUnitario: 80,
            tipoCobro: 'POR_DIA',
          },
          {
            equipoId: equipoB.id,
            descripcion: equipoB.modelo,
            cantidad: 4,
            dias: 30,
            precioUnitario: 10,
            tipoCobro: 'POR_DIA',
          },
        ],
      },
      empresaId,
      sucursalId,
      usuarioId,
    );

    expect(cotizacion).toBeDefined();
    expect(cotizacion.id).toBeDefined();
    cotizacionId = cotizacion.id;

    // Aprobar internamente / revisar
    const aprobada = await quotationsService.approveInternal(
      cotizacionId,
      empresaId,
      usuarioId,
    );
    expect(aprobada.estado).toBe('PENDIENTE');

    // Enviar al cliente
    const enviada = await quotationsService.sendToClient(
      cotizacionId,
      empresaId,
      usuarioId,
      {
        emailDestino: 'demo@bmconstrucciones.com',
      },
    );
    expect(enviada.success).toBe(true);
    expect(enviada.data?.estado).toBe('ENVIADA');

    // Aceptar cotización (crea contrato y reservas)
    const aceptada = await quotationsService.acceptOnBehalf(
      cotizacionId,
      empresaId,
      usuarioId,
      {
        notas: 'Aprobación autorizada en sitio de obra por Ing. Supervisor Demo',
      },
    );
    expect(aceptada.success).toBe(true);
    contratoId = aceptada.contract?.id || (aceptada as any).data?.contratoId;
    expect(contratoId).toBeDefined();
  });

  it('2. Contrato SIN_ABRIR: A=RESERVADO, B=6 disp. Abrir con 2 cortes → ACTIVO', async () => {
    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
    });
    expect(contrato).toBeDefined();
    expect(contrato?.estado).toBe('SIN_ABRIR');

    // Verificar estados de inventario tras la reserva
    const aPostReserva = await prisma.equipo.findUnique({
      where: { id: equipoA.id },
    });
    const bPostReserva = await prisma.equipo.findUnique({
      where: { id: equipoB.id },
    });

    expect(aPostReserva?.estado).toBe(EstadoEquipo.RESERVADO);
    // Lote B: 10 iniciales - 4 reservadas = 6 disponibles
    expect(bPostReserva?.cantidadDisponible).toBe(6);
    expect(bPostReserva?.estado).toBe(EstadoEquipo.DISPONIBLE);

    // Abrir contrato con 2 cortes de facturación
    const contratoAbierto = await contractsService.openContract(
      contratoId,
      15,
      empresaId,
      usuarioId,
      2,
    );
    expect(contratoAbierto.estado).toBe('ACTIVO');

    // Verificar que se hayan generado los 2 cortes
    const cortes = await prisma.corteFacturacion.findMany({
      where: { contratoId },
      orderBy: { numeroCorte: 'asc' },
    });
    expect(cortes.length).toBe(2);
    expect(cortes[0].numeroCorte).toBe(1);
    expect(cortes[1].numeroCorte).toBe(2);
  });

  it('3. Despacho: A=DESPACHADO, B=DISPONIBLE con 6. Acta entrega persistida sin errores', async () => {
    const despacho = await operationsService.createDespacho(
      {
        contratoId,
        operadorNombre: 'Juan Perez Chofer',
        vehiculoEnvio: 'Camión Hino BM-01',
        comentarios: 'Despacho completo de equipos de prueba',
        actaEntregaData: {
          folio: `ACTA-ENT-${Date.now()}`,
          clienteNombre: 'Constructora Demo BM S.A.',
          obra: 'Proyecto Demo BM Edificio Norte',
          fecha: new Date().toISOString(),
          recibidoPor: 'Ing. Supervisor Demo',
          cedula: '001-010190-0001A',
        },
        items: [
          {
            equipoId: equipoA.id,
            numeroSerie: equipoA.numeroSerie,
            cantidad: 1,
            horometroSalida: 100,
            estadoSalida: 'BUENO',
            checklistOk: true,
          },
          {
            equipoId: equipoB.id,
            cantidad: 4,
            estadoSalida: 'BUENO',
            checklistOk: true,
          },
        ],
      },
      empresaId,
      usuarioId,
    );

    expect(despacho).toBeDefined();
    expect(despacho.id).toBeDefined();
    despachoId = despacho.id;

    // Verificar estados de inventario tras despacho
    const aPostDespacho = await prisma.equipo.findUnique({
      where: { id: equipoA.id },
    });
    const bPostDespacho = await prisma.equipo.findUnique({
      where: { id: equipoB.id },
    });

    // A (Serializado) pasa a DESPACHADO con 0 disponible
    expect(aPostDespacho?.estado).toBe(EstadoEquipo.DESPACHADO);
    expect(aPostDespacho?.cantidadDisponible).toBe(0);

    // B (POR_CANTIDAD) sigue con 6 disponibles y estado DISPONIBLE (Fix P0 validado!)
    expect(bPostDespacho?.cantidadDisponible).toBe(6);
    expect(bPostDespacho?.estado).toBe(EstadoEquipo.DISPONIBLE);

    // Verificar acta entrega guardada
    const despachoDb = await prisma.despacho.findUnique({
      where: { id: despachoId },
    });
    expect(despachoDb?.actaEntregaData).toBeDefined();
    const actaData = despachoDb?.actaEntregaData as any;
    expect(actaData?.clienteNombre).toBe('Constructora Demo BM S.A.');
    expect(actaData?.folio).toContain('ACTA-ENT-');
  });

  it('4. Retorno parcial 2 de B: B=8, pendiente muestra A + 2 B, contrato ACTIVO', async () => {
    const retornoParcial = await operationsService.createRetorno(
      {
        contratoId,
        recibidoPor: 'Receptor Bodega Central',
        entregadoPor: 'Ing. Supervisor Demo',
        cedulaEntregante: '001-010190-0001A',
        items: [
          {
            equipoId: equipoB.id,
            cantidadRetornada: 2,
            cantidadBuenEstado: 2,
            cantidadDañada: 0,
            inspeccionEstado: {
              estadoFisico: 'BUENO',
              accesoriosCompletos: true,
              funcionamiento: 'FUNCIONA',
            },
          },
        ],
      },
      empresaId,
      usuarioId,
    );

    expect(retornoParcial).toBeDefined();

    // B debe tener 6 + 2 = 8 disponibles
    const bPostRetornoParcial = await prisma.equipo.findUnique({
      where: { id: equipoB.id },
    });
    expect(bPostRetornoParcial?.cantidadDisponible).toBe(8);
    expect(bPostRetornoParcial?.estado).toBe(EstadoEquipo.DISPONIBLE);

    // Contrato debe seguir ACTIVO
    const contratoDb = await prisma.contrato.findUnique({
      where: { id: contratoId },
    });
    expect(contratoDb?.estado).toBe('ACTIVO');

    // Comprobar pendientes de retorno:
    // Despachado: A=1, B=4
    // Retornado acumulado: A=0, B=2
    // Pendiente: A=1, B=2
    const totalDespachado = await prisma.detalleDespacho.groupBy({
      by: ['equipoId'],
      where: { despacho: { contratoId } },
      _sum: { cantidad: true },
    });
    const totalRetornado = await prisma.detalleDevolucion.groupBy({
      by: ['equipoId'],
      where: { devolucion: { contratoId } },
      _sum: { cantidadRetornada: true },
    });

    const despA =
      totalDespachado.find((d) => d.equipoId === equipoA.id)?._sum.cantidad ||
      0;
    const despB =
      totalDespachado.find((d) => d.equipoId === equipoB.id)?._sum.cantidad ||
      0;
    const retA =
      totalRetornado.find((r) => r.equipoId === equipoA.id)?._sum
        .cantidadRetornada || 0;
    const retB =
      totalRetornado.find((r) => r.equipoId === equipoB.id)?._sum
        .cantidadRetornada || 0;

    expect(despA - retA).toBe(1); // 1 A pendiente
    expect(despB - retB).toBe(2); // 2 B pendientes
  });

  it('5. Retorno final: A dañado + 2 B (1 dañada) → A EN_MANTENIMIENTO + OT; B=9 + OT; contrato FINALIZADO', async () => {
    const retornoFinal = await operationsService.createRetorno(
      {
        contratoId,
        recibidoPor: 'Receptor Bodega Central',
        entregadoPor: 'Ing. Supervisor Demo',
        cedulaEntregante: '001-010190-0001A',
        actaRetornoData: {
          folio: `ACTA-RET-${Date.now()}`,
          clienteNombre: 'Constructora Demo BM S.A.',
          obra: 'Proyecto Demo BM Edificio Norte',
          fecha: new Date().toISOString(),
          recibidoPor: 'Receptor Bodega Central',
          entregadoPor: 'Ing. Supervisor Demo',
        },
        items: [
          {
            equipoId: equipoA.id,
            cantidadRetornada: 1,
            horometroFinal: 120.0, // Salida fue 100
            daniosDetectados: true,
            descripcionDanios: 'Golpe en chasis y fuga de aceite',
            danios: [
              {
                componente: 'Chasis',
                tipoDano: 'Golpe y fuga de aceite',
                descripcion: 'Reparación de chasis',
                cobrable: true,
                costoEstimado: 120,
              },
            ],
            inspeccionEstado: {
              estadoFisico: 'DANADO',
              accesoriosCompletos: true,
              funcionamiento: 'NO_FUNCIONA',
            },
          },
          {
            equipoId: equipoB.id,
            cantidadRetornada: 2,
            cantidadBuenEstado: 1, // 1 sana
            cantidadDañada: 1, // 1 dañada va a taller
            daniosDetectados: true,
            descripcionDanios: 'Cruceta doblada',
            danios: [
              {
                componente: 'Cruceta',
                tipoDano: 'Cruceta doblada',
                descripcion: 'Reemplazo cruceta',
                cobrable: true,
                costoEstimado: 45,
              },
            ],
            inspeccionEstado: {
              estadoFisico: 'DANADO',
              accesoriosCompletos: true,
              funcionamiento: 'FUNCIONA',
            },
          },
        ],
      },
      empresaId,
      usuarioId,
    );

    expect(retornoFinal).toBeDefined();

    // A debe quedar EN_MANTENIMIENTO con horómetro actualizado a 120
    const aPostFinal = await prisma.equipo.findUnique({
      where: { id: equipoA.id },
    });
    expect(aPostFinal?.estado).toBe(EstadoEquipo.EN_MANTENIMIENTO);
    expect(aPostFinal?.horometro).toBe(120.0);

    // B debe tener 8 + 1 sana = 9 disponibles (la dañada espera en taller)
    const bPostFinal = await prisma.equipo.findUnique({
      where: { id: equipoB.id },
    });
    expect(bPostFinal?.cantidadDisponible).toBe(9);
    expect(bPostFinal?.estado).toBe(EstadoEquipo.DISPONIBLE);

    // Contrato debe cerrarse a FINALIZADO
    const contratoCerrado = await prisma.contrato.findUnique({
      where: { id: contratoId },
    });
    expect(contratoCerrado?.estado).toBe('FINALIZADO');

    // Verificar órdenes de mantenimiento automáticas creadas
    const otA = await prisma.mantenimiento.findFirst({
      where: { equipoId: equipoA.id, estado: EstadoMantenimiento.EN_PROCESO },
    });
    const otB = await prisma.mantenimiento.findFirst({
      where: { equipoId: equipoB.id, estado: EstadoMantenimiento.EN_PROCESO },
    });

    expect(otA).toBeDefined();
    expect(otA?.tipo).toBe(TipoMantenimiento.CORRECTIVO);
    expect(otB).toBeDefined();
    expect(otB?.tipo).toBe(TipoMantenimiento.CORRECTIVO);
  });

  it('6. Completar taller: A DISPONIBLE, B=10; aparece en Facturación > Reparaciones por Cobrar', async () => {
    const otA = await prisma.mantenimiento.findFirst({
      where: { equipoId: equipoA.id, estado: EstadoMantenimiento.EN_PROCESO },
    });
    const otB = await prisma.mantenimiento.findFirst({
      where: { equipoId: equipoB.id, estado: EstadoMantenimiento.EN_PROCESO },
    });

    expect(otA).toBeDefined();
    expect(otB).toBeDefined();

    // Completar OT de Equipo A (contrato ya está cerrado, debe volver a DISPONIBLE)
    await maintenanceService.update(
      otA!.id,
      {
        estado: EstadoMantenimiento.COMPLETADO,
        costo: 120,
        gastos: [
          {
            tipo: 'REPUESTO',
            descripcion: 'Reparación de chasis',
            monto: 120,
            cobrableCliente: true,
          },
        ],
      },
      empresaId,
      usuarioId,
    );

    // Completar OT de Equipo B (lote debe recuperar la unidad reparada -> 9 + 1 = 10)
    await maintenanceService.update(
      otB!.id,
      {
        estado: EstadoMantenimiento.COMPLETADO,
        costo: 45,
        gastos: [
          {
            tipo: 'REPUESTO',
            descripcion: 'Reemplazo cruceta',
            monto: 45,
            cobrableCliente: true,
          },
        ],
      },
      empresaId,
      usuarioId,
    );

    // Verificar estados finales
    const aFinal = await prisma.equipo.findUnique({
      where: { id: equipoA.id },
    });
    const bFinal = await prisma.equipo.findUnique({
      where: { id: equipoB.id },
    });

    expect(aFinal?.estado).toBe(EstadoEquipo.DISPONIBLE);
    expect(aFinal?.cantidadDisponible).toBe(1);

    expect(bFinal?.estado).toBe(EstadoEquipo.DISPONIBLE);
    expect(bFinal?.cantidadDisponible).toBe(10);

    // Verificar en Facturación > Reparaciones por Cobrar
    const damageReturns = await billingService.getDamageReturns(empresaId);
    const returnInBilling = damageReturns.find(
      (r) => r.contratoId === contratoId,
    );
    expect(returnInBilling).toBeDefined();
    expect(returnInBilling?.facturaCargo).toBeNull();
  });

  it('7. Negativos: OT manual sobre despachado = error; baja de despachado = error; horómetro menor = error', async () => {
    // Crear equipo temporal en estado DESPACHADO para pruebas de bloqueo
    const marca = await prisma.marca.findFirst();
    const eqDespachado = await inventoryService.create(
      {
        sucursalId,
        categoriaId,
        marcaId: marca?.id,
        codigo: `DEMO-DESP-${Date.now()}`,
        modelo: 'Equipo Prueba Bloqueos Despachado',
        tipoControl: TipoControlEquipo.SERIALIZADO,
        tieneHorometro: true,
        horometro: 50.0,
        cantidadTotal: 1,
        cantidadDisponible: 0,
        estado: EstadoEquipo.DESPACHADO,
        precioRentaDia: 100.0,
      } as any,
      empresaId,
      usuarioId,
    );

    try {
      // 7.1 OT manual EN_PROCESO sobre equipo despachado -> BadRequestException
      await expect(
        maintenanceService.create(
          {
            equipoId: eqDespachado.id,
            tipo: TipoMantenimiento.CORRECTIVO,
            estado: EstadoMantenimiento.EN_PROCESO,
            fechaProgramacion: new Date().toISOString(),
            descripcion: 'OT indebida sobre equipo en obra',
          },
          empresaId,
          usuarioId,
        ),
      ).rejects.toThrow(BadRequestException);

      // 7.2 Baja de inventario sobre equipo despachado -> BadRequestException
      await expect(
        inventoryService.remove(eqDespachado.id, empresaId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        inventoryService.update(
          eqDespachado.id,
          { estado: EstadoEquipo.BAJA } as any,
          empresaId,
          usuarioId,
        ),
      ).rejects.toThrow(BadRequestException);

      // 7.3 Horómetro menor al de salida en retorno -> BadRequestException
      // Simulamos retorno con horómetro 80 cuando el equipo tiene 100
      await expect(
        operationsService.createRetorno(
          {
            contratoId, // contrato cerrado o abierto
            recibidoPor: 'Receptor Bodega',
            items: [
              {
                equipoId: eqDespachado.id,
                cantidadRetornada: 1,
                horometroFinal: 40.0, // menor a 50
                inspeccionEstado: {
                  estadoFisico: 'BUENO',
                  accesoriosCompletos: true,
                  funcionamiento: 'FUNCIONA',
                },
              },
            ],
          },
          empresaId,
          usuarioId,
        ),
      ).rejects.toThrow(BadRequestException);
    } finally {
      await prisma.equipo.delete({ where: { id: eqDespachado.id } });
    }
  });
});
