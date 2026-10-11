import {
  PrismaClient,
  AreaContableNomina,
  TipoContratoNomina,
  TipoSalarioNomina,
  MetodoIrNomina,
  FrecuenciaPagoNomina,
  RegimenInssNomina,
  FormaPagoNomina,
  EstadoEmpleado,
  TipoPeriodoNomina,
  EstadoPeriodoNomina,
  EstadoPlanilla,
  TipoConceptoNomina,
  MetodoIrConcepto,
  MetodoCalculoComision,
  BaseCalculoComision,
  TratamientoNegativoComision,
  EstadoVersionPlan,
  Prisma,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Salario mínimo oficial de Nicaragua para el sector Comercio y Servicios / Ventas (2024-2026): C$ 10,500.00 mensual
const SALARIO_MINIMO_NICARAGUA = 10500.0;
const SALARIO_QUINCENAL = SALARIO_MINIMO_NICARAGUA / 2; // C$ 5,250.00

// Deducciones y Aportes según Ley Laboral de Nicaragua (Ley 185 y Ley 822)
// INSS Laboral: 7%
const INSS_LABORAL_QUINCENAL = Math.round(SALARIO_QUINCENAL * 0.07 * 100) / 100; // C$ 367.50
// IR Salarial Quincenal: Base anual = (10,500 - 735) * 12 = 117,180. Tramo 15% sobre 17,180 = 2,577 anual / 24 = 107.38
const IR_QUINCENAL = 107.38;
const TOTAL_DEDUCCIONES_QUINCENAL = INSS_LABORAL_QUINCENAL + IR_QUINCENAL; // C$ 474.88
const NETO_PAGAR_QUINCENAL = SALARIO_QUINCENAL - TOTAL_DEDUCCIONES_QUINCENAL; // C$ 4,775.12

// Aportes Patronales: INSS Patronal (21.5%), INATEC (2%)
const INSS_PATRONAL_QUINCENAL = Math.round(SALARIO_QUINCENAL * 0.215 * 100) / 100; // C$ 1,128.75
const INATEC_QUINCENAL = Math.round(SALARIO_QUINCENAL * 0.02 * 100) / 100; // C$ 105.00
const COSTO_PATRONAL_QUINCENAL = INSS_PATRONAL_QUINCENAL + INATEC_QUINCENAL; // C$ 1,233.75

// Provisiones legales quincenales (1/12):
const PROVISION_QUINCENAL = Math.round((SALARIO_QUINCENAL / 12) * 100) / 100; // C$ 437.50

const EMPLEADOS_VENTAS_DATA = [
  {
    codigo: 'EMP-VEN-01',
    nombres: 'David Antonio',
    apellidos: 'Jarquín Blandón',
    cedula: '001-150495-0021A',
    numeroInss: '8123456-1',
    cargo: 'Ejecutivo Comercial y Renta de Maquinaria',
    vendedorCodigo: 'DAVID',
    nombreMostrar: 'David Jarquín',
    banco: 'BAC Credomatic Nicaragua',
    cuenta: '365829104',
    telefono: '+505 8899-1122',
    email: 'david.jarquin@bmconstrucciones.com',
  },
  {
    codigo: 'EMP-VEN-02',
    nombres: 'Nylska María',
    apellidos: 'González Rivas',
    cedula: '001-200898-0044B',
    numeroInss: '8234567-2',
    cargo: 'Asesora de Ventas y Cuentas Clave',
    vendedorCodigo: 'NYLSKA',
    nombreMostrar: 'Nylska González',
    banco: 'BANPRO Grupo Promerica',
    cuenta: '10023456789012',
    telefono: '+505 8765-4321',
    email: 'nylska.gonzalez@bmconstrucciones.com',
  },
  {
    codigo: 'EMP-VEN-03',
    nombres: 'Jorge Luis',
    apellidos: 'Mendoza Rostrán',
    cedula: '001-100292-0018C',
    numeroInss: '8345678-3',
    cargo: 'Asesor de Ventas y Flota Mostrador',
    vendedorCodigo: 'JORGE',
    nombreMostrar: 'Jorge Mendoza',
    banco: 'Banco LAFISE Bancentro',
    cuenta: '102456789',
    telefono: '+505 8432-1098',
    email: 'jorge.mendoza@bmconstrucciones.com',
  },
];

async function main() {
  console.log('🚀 Iniciando sembrado de Trabajadores de Ventas en Nómina (Salario Mínimo Nicaragua)...');

  // 1. Obtener todas las empresas registradas
  const empresas = await prisma.empresa.findMany();
  if (empresas.length === 0) {
    console.error('❌ No se encontró ninguna Empresa en la base de datos.');
    return;
  }

  for (const empresa of empresas) {
    console.log(`\n🏢 Procesando Empresa: ${empresa.nombre} (${empresa.id})`);

    // 2. Obtener o crear Sucursal Central
    let sucursal = await prisma.sucursal.findFirst({
      where: { empresaId: empresa.id },
    });
    if (!sucursal) {
      sucursal = await prisma.sucursal.create({
        data: {
          empresaId: empresa.id,
          codigo: 'SUC-CENTRAL',
          nombre: 'Sucursal Central Managua',
          direccion: 'Km 9.5 Carretera Masaya, Managua, Nicaragua',
          telefono: '+505 2222-2222',
        },
      });
      console.log(`  📍 Sucursal creada: ${sucursal.nombre}`);
    } else {
      console.log(`  📍 Sucursal existente: ${sucursal.nombre} (${sucursal.id})`);
    }

    // 3. Sembrar parámetros legales de nómina (INSS, INATEC, Tramos IR)
    const ahora = new Date('2026-01-01');

    // INSS
    const inssExist = await prisma.paramInss.findFirst({ where: { empresaId: empresa.id } });
    if (!inssExist) {
      await prisma.paramInss.create({
        data: {
          empresaId: empresa.id,
          regimen: RegimenInssNomina.INTEGRAL,
          tamanoEmpleador: 'PEQUENO',
          tasaLaboral: new Prisma.Decimal(7.0),
          tasaPatronal: new Prisma.Decimal(21.5),
          vigenteDesde: ahora,
          fuenteTexto: 'Decreto 06-2019 (Reglamento Seguridad Social Nicaragua)',
          fuenteUrl: 'https://www.inss.gob.ni',
          aprobadoPor: 'SISTEMA',
        },
      });
      console.log('  ⚖️ Parámetro INSS (7% / 21.5%) registrado.');
    }

    // INATEC
    const inatecExist = await prisma.paramInatec.findFirst({ where: { empresaId: empresa.id } });
    if (!inatecExist) {
      await prisma.paramInatec.create({
        data: {
          empresaId: empresa.id,
          tasa: new Prisma.Decimal(2.0),
          vigenteDesde: ahora,
          fuenteTexto: 'Ley Orgánica del INATEC (Decreto 40-94)',
          fuenteUrl: 'https://www.inatec.edu.ni',
          aprobadoPor: 'SISTEMA',
        },
      });
      console.log('  ⚖️ Parámetro INATEC (2%) registrado.');
    }

    // Tramos IR (Ley 822 Art. 23)
    const countIr = await prisma.paramIrTramo.count({ where: { empresaId: empresa.id } });
    if (countIr === 0) {
      const tramos = [
        { orden: 1, desdeExcl: 0, hastaIncl: 100000, impuestoBase: 0, porcentaje: 0, sobreExceso: 0 },
        { orden: 2, desdeExcl: 100000, hastaIncl: 200000, impuestoBase: 0, porcentaje: 15, sobreExceso: 100000 },
        { orden: 3, desdeExcl: 200000, hastaIncl: 350000, impuestoBase: 15000, porcentaje: 20, sobreExceso: 200000 },
        { orden: 4, desdeExcl: 350000, hastaIncl: 500000, impuestoBase: 45000, porcentaje: 25, sobreExceso: 350000 },
        { orden: 5, desdeExcl: 500000, hastaIncl: null, impuestoBase: 82500, porcentaje: 30, sobreExceso: 500000 },
      ];
      for (const t of tramos) {
        await prisma.paramIrTramo.create({
          data: {
            empresaId: empresa.id,
            orden: t.orden,
            desdeExcl: new Prisma.Decimal(t.desdeExcl),
            hastaIncl: t.hastaIncl !== null ? new Prisma.Decimal(t.hastaIncl) : null,
            impuestoBase: new Prisma.Decimal(t.impuestoBase),
            porcentaje: new Prisma.Decimal(t.porcentaje),
            sobreExceso: new Prisma.Decimal(t.sobreExceso),
            vigenteDesde: ahora,
            fuenteTexto: 'Ley 822 (Ley de Concertación Tributaria Art. 23)',
            fuenteUrl: 'https://www.dgi.gob.ni',
          },
        });
      }
      console.log('  ⚖️ Parámetros de Tramos IR (Ley 822) sembrados.');
    }

    // Conceptos de Nómina
    const conceptosDef = [
      { codigo: 'SAL_ORD', nombre: 'Salario Ordinario', tipo: TipoConceptoNomina.DEVENGO, afectaInss: true, afectaInatec: true, afectaIr: true, orden: 1 },
      { codigo: 'HEX', nombre: 'Horas Extraordinarias', tipo: TipoConceptoNomina.DEVENGO, afectaInss: true, afectaInatec: true, afectaIr: true, orden: 2 },
      { codigo: 'COM', nombre: 'Comisiones de Ventas', tipo: TipoConceptoNomina.DEVENGO, afectaInss: true, afectaInatec: true, afectaIr: true, orden: 3 },
      { codigo: 'INSS_L', nombre: 'INSS Laboral (7%)', tipo: TipoConceptoNomina.DEDUCCION, afectaInss: false, afectaInatec: false, afectaIr: false, orden: 10 },
      { codigo: 'IR', nombre: 'Retención IR Salarial', tipo: TipoConceptoNomina.DEDUCCION, afectaInss: false, afectaInatec: false, afectaIr: false, orden: 11 },
      { codigo: 'INSS_P', nombre: 'INSS Patronal (21.5%)', tipo: TipoConceptoNomina.APORTE, afectaInss: false, afectaInatec: false, afectaIr: false, orden: 20 },
      { codigo: 'INATEC', nombre: 'Aporte INATEC (2%)', tipo: TipoConceptoNomina.APORTE, afectaInss: false, afectaInatec: false, afectaIr: false, orden: 21 },
      { codigo: 'PROV_VAC', nombre: 'Provisión Vacaciones', tipo: TipoConceptoNomina.PROVISION, afectaInss: false, afectaInatec: false, afectaIr: false, orden: 30 },
      { codigo: 'PROV_AGUI', nombre: 'Provisión Décimo Tercer Mes', tipo: TipoConceptoNomina.PROVISION, afectaInss: false, afectaInatec: false, afectaIr: false, orden: 31 },
      { codigo: 'PROV_IND', nombre: 'Provisión Indemnización Art. 45', tipo: TipoConceptoNomina.PROVISION, afectaInss: false, afectaInatec: false, afectaIr: false, orden: 32 },
    ];

    const conceptosMap = new Map<string, any>();
    for (const c of conceptosDef) {
      let conc = await prisma.conceptoNomina.findUnique({
        where: { empresaId_codigo: { empresaId: empresa.id, codigo: c.codigo } },
      });
      if (!conc) {
        conc = await prisma.conceptoNomina.create({
          data: {
            empresaId: empresa.id,
            codigo: c.codigo,
            nombre: c.nombre,
            tipo: c.tipo,
            afectaInss: c.afectaInss,
            afectaInatec: c.afectaInatec,
            afectaIr: c.afectaIr,
            metodoIr: MetodoIrConcepto.ORDINARIO,
            ordenCalculo: c.orden,
          },
        });
      }
      conceptosMap.set(c.codigo, conc);
    }
    console.log(`  📋 Conceptos de Nómina listos (${conceptosMap.size}).`);

    // 4. Sembrar o Actualizar Empleados de Ventas
    const empleadosCreados: any[] = [];
    for (const empData of EMPLEADOS_VENTAS_DATA) {
      let empleado = await prisma.empleado.findFirst({
        where: {
          empresaId: empresa.id,
          OR: [
            { codigo: empData.codigo },
            { cedula: empData.cedula },
            { numeroInss: empData.numeroInss },
          ],
        },
      });

      if (!empleado) {
        empleado = await prisma.empleado.create({
          data: {
            empresaId: empresa.id,
            codigo: empData.codigo,
            nombres: empData.nombres,
            apellidos: empData.apellidos,
            cedula: empData.cedula,
            numeroInss: empData.numeroInss,
            cargo: empData.cargo,
            areaContable: AreaContableNomina.VENTAS,
            sucursalId: sucursal.id,
            salarioMensual: new Prisma.Decimal(SALARIO_MINIMO_NICARAGUA),
            tipoContrato: TipoContratoNomina.INDETERMINADO,
            tipoSalario: TipoSalarioNomina.FIJO,
            metodoIr: MetodoIrNomina.FIJO,
            frecuenciaPago: FrecuenciaPagoNomina.QUINCENAL,
            regimenInss: RegimenInssNomina.INTEGRAL,
            formaPago: FormaPagoNomina.TRANSFERENCIA,
            estado: EstadoEmpleado.ACTIVO,
            fechaIngreso: new Date('2026-01-01T00:00:00.000Z'),
            email: empData.email,
            telefono: empData.telefono,
            direccion: 'Managua, Nicaragua',
          },
        });
        console.log(`  👤 Empleado creado: ${empleado.nombres} ${empleado.apellidos} (${empleado.codigo}) - C$ ${SALARIO_MINIMO_NICARAGUA.toFixed(2)}`);
      } else {
        empleado = await prisma.empleado.update({
          where: { id: empleado.id },
          data: {
            nombres: empData.nombres,
            apellidos: empData.apellidos,
            cargo: empData.cargo,
            areaContable: AreaContableNomina.VENTAS,
            salarioMensual: new Prisma.Decimal(SALARIO_MINIMO_NICARAGUA),
            sucursalId: sucursal.id,
            estado: EstadoEmpleado.ACTIVO,
          },
        });
        console.log(`  👤 Empleado actualizado: ${empleado.nombres} ${empleado.apellidos} (${empleado.codigo}) - C$ ${SALARIO_MINIMO_NICARAGUA.toFixed(2)}`);
      }

      // Historial de Salario
      const salHist = await prisma.empleadoSalarioHist.findFirst({
        where: { empleadoId: empleado.id },
      });
      if (!salHist) {
        await prisma.empleadoSalarioHist.create({
          data: {
            empleadoId: empleado.id,
            vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
            salarioMensual: new Prisma.Decimal(SALARIO_MINIMO_NICARAGUA),
            cargo: empData.cargo,
            motivo: 'Salario mínimo de ley Nicaragua (Comercio / Ventas)',
            aprobadoPor: 'Gerencia General',
          },
        });
      }

      // Cuenta Bancaria
      const cuentaExist = await prisma.empleadoCuentaBancaria.findFirst({
        where: { empleadoId: empleado.id },
      });
      if (!cuentaExist) {
        await prisma.empleadoCuentaBancaria.create({
          data: {
            empleadoId: empleado.id,
            banco: empData.banco,
            numeroCuenta: empData.cuenta,
            esPrincipal: true,
          },
        });
      }

      // 5. Vincular / Actualizar Vendedor
      let vendedor = await prisma.vendedor.findFirst({
        where: {
          empresaId: empresa.id,
          OR: [
            { codigo: empData.vendedorCodigo },
            { empleadoId: empleado.id },
          ],
        },
      });

      if (!vendedor) {
        vendedor = await prisma.vendedor.create({
          data: {
            empresaId: empresa.id,
            codigo: empData.vendedorCodigo,
            nombreMostrar: empData.nombreMostrar,
            empleadoId: empleado.id,
            sucursalId: sucursal.id,
            esComisionable: true,
            activo: true,
            fechaAlta: new Date('2026-01-01T00:00:00.000Z'),
          },
        });
        console.log(`  💼 Vendedor creado: ${vendedor.nombreMostrar} (${vendedor.codigo}) vinculado a empleado`);
      } else {
        vendedor = await prisma.vendedor.update({
          where: { id: vendedor.id },
          data: {
            codigo: empData.vendedorCodigo,
            nombreMostrar: empData.nombreMostrar,
            empleadoId: empleado.id,
            sucursalId: sucursal.id,
            esComisionable: true,
            activo: true,
          },
        });
        console.log(`  💼 Vendedor vinculado: ${vendedor.nombreMostrar} (${vendedor.codigo}) vinculado a empleado`);
      }

      empleadosCreados.push({ empleado, vendedor, empData });
    }

    // 6. Planes de Comisión Básicos para que el módulo de comisiones esté activo
    for (const item of empleadosCreados) {
      const planCodigo = `PLAN_${item.empData.vendedorCodigo}`;
      let plan = await prisma.planComision.findFirst({
        where: { empresaId: empresa.id, codigo: planCodigo },
        include: { versiones: true },
      });

      if (!plan) {
        plan = await prisma.planComision.create({
          data: {
            empresaId: empresa.id,
            codigo: planCodigo,
            nombre: `Plan de Comisiones ${item.empData.nombreMostrar}`,
            descripcion: `Plan comercial de comisiones para ${item.empData.nombreMostrar}`,
            versiones: {
              create: {
                version: 1,
                vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
                metodo: MetodoCalculoComision.ESCALONADO,
                base: BaseCalculoComision.FACTURADO,
                incluyeIva: false,
                tratamientoNegativo: TratamientoNegativoComision.ARRASTRAR,
                mesesMaxArrastre: 3,
                estado: EstadoVersionPlan.ACTIVA,
                tramos: {
                  create: [
                    { orden: 1, desdeExcl: 0, hastaIncl: 300000, porcentaje: 2.0 },
                    { orden: 2, desdeExcl: 300000, hastaIncl: null, porcentaje: 1.0 },
                  ],
                },
              },
            },
          },
          include: { versiones: true },
        });
      }

      // Asignar al vendedor si no está asignado
      const asig = await prisma.asignacionVendedorPlan.findFirst({
        where: { vendedorId: item.vendedor.id, planId: plan.id },
      });
      if (!asig) {
        await prisma.asignacionVendedorPlan.create({
          data: {
            vendedorId: item.vendedor.id,
            planId: plan.id,
            vigenteDesde: new Date('2026-01-01T00:00:00.000Z'),
            motivo: `Asignación automática plan ${plan.nombre}`,
          },
        });
      }
    }

    // 7. Período de Nómina (1ra Quincena Octubre 2026)
    let periodoOct1 = await prisma.periodoNomina.findFirst({
      where: {
        empresaId: empresa.id,
        anio: 2026,
        mes: 10,
        quincena: 1,
        tipo: TipoPeriodoNomina.ORDINARIA,
      },
    });

    if (!periodoOct1) {
      periodoOct1 = await prisma.periodoNomina.create({
        data: {
          empresaId: empresa.id,
          anio: 2026,
          mes: 10,
          quincena: 1,
          tipo: TipoPeriodoNomina.ORDINARIA,
          fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
          fechaFin: new Date('2026-10-15T23:59:59.999Z'),
          fechaPago: new Date('2026-10-15T00:00:00.000Z'),
          estado: EstadoPeriodoNomina.ABIERTO,
        },
      });
      console.log(`  📅 Período creado: Quincena 1 - Octubre 2026 (${periodoOct1.id})`);
    }

    // También creamos el Período 2 (2da Quincena Octubre 2026) disponible
    let periodoOct2 = await prisma.periodoNomina.findFirst({
      where: {
        empresaId: empresa.id,
        anio: 2026,
        mes: 10,
        quincena: 2,
        tipo: TipoPeriodoNomina.ORDINARIA,
      },
    });

    if (!periodoOct2) {
      periodoOct2 = await prisma.periodoNomina.create({
        data: {
          empresaId: empresa.id,
          anio: 2026,
          mes: 10,
          quincena: 2,
          tipo: TipoPeriodoNomina.ORDINARIA,
          fechaInicio: new Date('2026-10-16T00:00:00.000Z'),
          fechaFin: new Date('2026-10-31T23:59:59.999Z'),
          fechaPago: new Date('2026-10-31T00:00:00.000Z'),
          estado: EstadoPeriodoNomina.ABIERTO,
        },
      });
      console.log(`  📅 Período creado: Quincena 2 - Octubre 2026 (${periodoOct2.id})`);
    }

    // 8. Crear / Calcular la Planilla para la 1ra Quincena de Octubre 2026
    let planilla = await prisma.planilla.findFirst({
      where: {
        periodoId: periodoOct1.id,
        empresaId: empresa.id,
      },
      include: { empleados: { include: { lineas: true } } },
    });

    if (!planilla) {
      planilla = await prisma.planilla.create({
        data: {
          empresaId: empresa.id,
          periodoId: periodoOct1.id,
          sucursalId: sucursal.id,
          estado: EstadoPlanilla.CALCULADA,
          calculadoEn: new Date('2026-10-15T12:00:00.000Z'),
          totalDevengado: new Prisma.Decimal(0),
          totalDeducciones: new Prisma.Decimal(0),
          totalNeto: new Prisma.Decimal(0),
          totalPatronal: new Prisma.Decimal(0),
        },
        include: { empleados: { include: { lineas: true } } },
      });
      console.log(`  🧾 Planilla creada para período Octubre Quincena 1 (${planilla.id})`);
    }

    // Insertar las líneas de planilla para cada empleado de ventas
    let totalPlanillaDevengado = 0;
    let totalPlanillaDeducciones = 0;
    let totalPlanillaNeto = 0;
    let totalPlanillaPatronal = 0;

    for (const item of empleadosCreados) {
      let planEmp = await prisma.planillaEmpleado.findUnique({
        where: {
          planillaId_empleadoId: {
            planillaId: planilla.id,
            empleadoId: item.empleado.id,
          },
        },
        include: { lineas: true },
      });

      if (!planEmp) {
        planEmp = await prisma.planillaEmpleado.create({
          data: {
            planillaId: planilla.id,
            empleadoId: item.empleado.id,
            salarioMensual: new Prisma.Decimal(SALARIO_MINIMO_NICARAGUA),
            sucursalId: sucursal.id,
            areaContable: AreaContableNomina.VENTAS,
            metodoIr: MetodoIrNomina.FIJO,
            diasTrabajados: new Prisma.Decimal(15.0),
            totalDevengado: new Prisma.Decimal(SALARIO_QUINCENAL),
            totalDeducciones: new Prisma.Decimal(TOTAL_DEDUCCIONES_QUINCENAL),
            netoPagar: new Prisma.Decimal(NETO_PAGAR_QUINCENAL),
            costoPatronal: new Prisma.Decimal(COSTO_PATRONAL_QUINCENAL),
          },
          include: { lineas: true },
        });

        // Crear líneas de conceptos para la colilla y desglose
        const lineasData = [
          // Devengos
          {
            conceptoId: conceptosMap.get('SAL_ORD')!.id,
            cantidad: 15.0,
            base: SALARIO_QUINCENAL,
            tasa: null,
            monto: SALARIO_QUINCENAL,
          },
          // Deducciones
          {
            conceptoId: conceptosMap.get('INSS_L')!.id,
            cantidad: null,
            base: SALARIO_QUINCENAL,
            tasa: 7.0,
            monto: INSS_LABORAL_QUINCENAL,
          },
          {
            conceptoId: conceptosMap.get('IR')!.id,
            cantidad: null,
            base: SALARIO_QUINCENAL,
            tasa: 15.0,
            monto: IR_QUINCENAL,
          },
          // Aportes Patronales
          {
            conceptoId: conceptosMap.get('INSS_P')!.id,
            cantidad: null,
            base: SALARIO_QUINCENAL,
            tasa: 21.5,
            monto: INSS_PATRONAL_QUINCENAL,
          },
          {
            conceptoId: conceptosMap.get('INATEC')!.id,
            cantidad: null,
            base: SALARIO_QUINCENAL,
            tasa: 2.0,
            monto: INATEC_QUINCENAL,
          },
          // Provisiones
          {
            conceptoId: conceptosMap.get('PROV_VAC')!.id,
            cantidad: null,
            base: SALARIO_QUINCENAL,
            tasa: 8.33,
            monto: PROVISION_QUINCENAL,
          },
          {
            conceptoId: conceptosMap.get('PROV_AGUI')!.id,
            cantidad: null,
            base: SALARIO_QUINCENAL,
            tasa: 8.33,
            monto: PROVISION_QUINCENAL,
          },
          {
            conceptoId: conceptosMap.get('PROV_IND')!.id,
            cantidad: null,
            base: SALARIO_QUINCENAL,
            tasa: 8.33,
            monto: PROVISION_QUINCENAL,
          },
        ];

        for (const ld of lineasData) {
          await prisma.planillaLinea.create({
            data: {
              planillaEmpleadoId: planEmp.id,
              conceptoId: ld.conceptoId,
              cantidad: ld.cantidad !== null ? new Prisma.Decimal(ld.cantidad) : null,
              base: new Prisma.Decimal(ld.base),
              tasa: ld.tasa !== null ? new Prisma.Decimal(ld.tasa) : null,
              monto: new Prisma.Decimal(ld.monto),
            },
          });
        }
        console.log(`    💰 Líneas calculadas para ${item.empleado.nombres} (Devengado: C$ ${SALARIO_QUINCENAL}, Neto: C$ ${NETO_PAGAR_QUINCENAL})`);
      }

      totalPlanillaDevengado += SALARIO_QUINCENAL;
      totalPlanillaDeducciones += TOTAL_DEDUCCIONES_QUINCENAL;
      totalPlanillaNeto += NETO_PAGAR_QUINCENAL;
      totalPlanillaPatronal += COSTO_PATRONAL_QUINCENAL;
    }

    // Actualizar totales de la planilla
    await prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        totalDevengado: new Prisma.Decimal(totalPlanillaDevengado),
        totalDeducciones: new Prisma.Decimal(totalPlanillaDeducciones),
        totalNeto: new Prisma.Decimal(totalPlanillaNeto),
        totalPatronal: new Prisma.Decimal(totalPlanillaPatronal),
      },
    });

    console.log(`  ✅ Planilla Quincenal finalizada con éxito.`);
    console.log(`     Total Devengado: C$ ${totalPlanillaDevengado.toFixed(2)}`);
    console.log(`     Total Deducciones: C$ ${totalPlanillaDeducciones.toFixed(2)}`);
    console.log(`     Total Neto a Pagar: C$ ${totalPlanillaNeto.toFixed(2)}`);
    console.log(`     Total Patronal: C$ ${totalPlanillaPatronal.toFixed(2)}`);
  }

  console.log('\n🎉 ¡Sembrado de empleados de ventas y nómina finalizado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error en script de nómina:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
