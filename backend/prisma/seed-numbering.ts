import { PrismaClient, TipoDocumentoSerie, EstadoSerieDocumento } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:7Hncl05dpakbMWpcoz9JpJJBhrckls4P_C5KPa0Rn3MjOPPaskm8p9yotj1lJics@localhost:5432/erp_dev?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedNumberingSeries() {
  console.log('📌 Iniciando siembra de Series y Folios de Documentos...');

  // 1. Obtener empresas
  const empresas = await prisma.empresa.findMany();
  if (empresas.length === 0) {
    console.log('⚠️ No hay empresas registradas para sembrar series.');
    return;
  }

  // 2. Sembrar permisos NUMERACION.MANAGE y NUMERACION.VIEW
  const permisosNumeracion = [
    {
      codigo: 'NUMERACION.MANAGE',
      descripcion: 'Configurar series y folios de documentos oficiales',
    },
    {
      codigo: 'NUMERACION.VIEW',
      descripcion: 'Consultar series y folios de documentos',
    },
  ];

  for (const item of permisosNumeracion) {
    await prisma.permiso.upsert({
      where: { codigo: item.codigo },
      update: { descripcion: item.descripcion },
      create: item,
    });
  }

  // Asignar permisos a roles ADMIN, GERENTE y CONTABILIDAD
  const rolesTarget = await prisma.rol.findMany({
    where: {
      nombre: { in: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'CONTADOR'] },
    },
  });

  const allPermisos = await prisma.permiso.findMany({
    where: { codigo: { in: ['NUMERACION.MANAGE', 'NUMERACION.VIEW'] } },
  });

  for (const rol of rolesTarget) {
    for (const perm of allPermisos) {
      await prisma.rolPermiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: rol.id,
            permisoId: perm.id,
          },
        },
        update: {},
        create: {
          rolId: rol.id,
          permisoId: perm.id,
        },
      });
    }
  }
  console.log('✅ Permisos NUMERACION.MANAGE y NUMERACION.VIEW vinculados');

  for (const empresa of empresas) {
    console.log(`\n🏢 Procesando empresa: ${empresa.nombre} (${empresa.id})`);

    // 3. Asegurar sucursales Km 10.5 y Centroamérica
    let sucKm10 = await prisma.sucursal.findFirst({
      where: {
        empresaId: empresa.id,
        OR: [{ codigo: 'KM10' }, { codigo: 'SUC-CENTRAL' }],
      },
    });

    if (!sucKm10) {
      sucKm10 = await prisma.sucursal.create({
        data: {
          empresaId: empresa.id,
          nombre: 'Sucursal Km 10.5 Carretera a Masaya',
          codigo: 'KM10',
          direccion: 'Km 10.5 Carretera a Masaya, Managua, Nicaragua',
          telefono: '+505 2279-0000',
        },
      });
      console.log(`  ➕ Sucursal Km 10.5 creada (${sucKm10.id})`);
    } else if (sucKm10.codigo === 'SUC-CENTRAL') {
      // Alias amigable preservando compatibilidad
      console.log(`  ℹ️ Sucursal central detectada (${sucKm10.codigo}): ${sucKm10.nombre}`);
    }

    let sucCA = await prisma.sucursal.findFirst({
      where: { empresaId: empresa.id, codigo: 'CA' },
    });

    if (!sucCA) {
      sucCA = await prisma.sucursal.create({
        data: {
          empresaId: empresa.id,
          nombre: 'Sucursal Centroamérica',
          codigo: 'CA',
          direccion: 'Rotonda Centroamérica 2c al sur, Managua, Nicaragua',
          telefono: '+505 2278-1111',
        },
      });
      console.log(`  ➕ Sucursal Centroamérica creada (${sucCA.id})`);
    }

    // 4. Calcular máximos existentes en la base de datos
    // Facturas
    const facturas = await prisma.factura.findMany({
      where: { empresaId: empresa.id },
      select: { folio: true, tipoFactura: true },
    });

    let maxFactura = 0;
    let maxFacturaDanio = 0;
    for (const f of facturas) {
      if (!f.folio) continue;
      const numMatch = f.folio.match(/(\d+)$/);
      if (numMatch) {
        const val = parseInt(numMatch[1], 10);
        if (f.tipoFactura === 'CARGO_DANOS') {
          if (val > maxFacturaDanio) maxFacturaDanio = val;
        } else {
          if (val > maxFactura) maxFactura = val;
        }
      }
    }
    // Si hay facturas emitidas pero sin sufijo numérico estricto, garantizar al menos la cantidad existente
    if (facturas.length > 0 && maxFactura === 0) {
      maxFactura = facturas.length;
    }

    // Recibos de Caja
    const recibos = await prisma.reciboCaja.findMany({
      where: { empresaId: empresa.id },
      select: { numeroRecibo: true },
    });
    let maxRecibo = 0;
    for (const r of recibos) {
      if (!r.numeroRecibo) continue;
      const match = r.numeroRecibo.match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxRecibo) maxRecibo = val;
      }
    }

    // Notas de Débito
    const notas = await prisma.notaDebito.findMany({
      where: { empresaId: empresa.id },
      select: { numeroNota: true },
    });
    let maxNota = 0;
    for (const n of notas) {
      if (!n.numeroNota) continue;
      const match = n.numeroNota.match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxNota) maxNota = val;
      }
    }

    // Cotizaciones
    const seqCot = await prisma.secuenciaNumeracion.findUnique({
      where: {
        empresaId_tipo: { empresaId: empresa.id, tipo: 'COTIZACION' },
      },
    });
    const cots = await prisma.cotizacion.findMany({
      where: { empresaId: empresa.id },
      select: { numeroCotizacion: true },
    });
    let maxCot = seqCot?.ultimoValor || 0;
    for (const c of cots) {
      if (!c.numeroCotizacion) continue;
      const match = c.numeroCotizacion.match(/COT-(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxCot) maxCot = val;
      }
    }

    // Contratos
    const anioActual = new Date().getFullYear();
    const seqCtr = await prisma.secuenciaNumeracion.findUnique({
      where: {
        empresaId_tipo: { empresaId: 'GLOBAL', tipo: `CONTRATO:${anioActual}` },
      },
    });
    const contratos = await prisma.contrato.findMany({
      select: { codigo: true },
    });
    let maxCtr = seqCtr?.ultimoValor || 0;
    for (const ct of contratos) {
      if (!ct.codigo) continue;
      const match = ct.codigo.match(/CTR-\d{4}-(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxCtr) maxCtr = val;
      }
    }

    console.log(
      `  📊 Máximos correlativos detectados: Factura=${maxFactura}, FacturaDaño=${maxFacturaDanio}, Recibo=${maxRecibo}, NotaDébito=${maxNota}, Cotización=${maxCot}, Contrato=${maxCtr}`,
    );

    // 5. Definir especificación de series a sembrar
    const seriesConfig = [
      // FACTURA Km 10.5
      {
        sucursalId: sucKm10.id,
        tipoDocumento: TipoDocumentoSerie.FACTURA,
        serie: sucKm10.codigo === 'KM10' ? 'KM10' : 'CENTRAL',
        prefijo: 'FAC',
        plantilla: '{prefijo}-{serie}-{numero}',
        relleno: 6,
        numeroDesde: 1,
        numeroHasta: 999999,
        numeroActual: maxFactura,
        esFiscal: true,
        alertaPorcentaje: 80,
      },
      // FACTURA Centroamérica
      {
        sucursalId: sucCA.id,
        tipoDocumento: TipoDocumentoSerie.FACTURA,
        serie: 'CA',
        prefijo: 'FAC',
        plantilla: '{prefijo}-{serie}-{numero}',
        relleno: 6,
        numeroDesde: 1,
        numeroHasta: 999999,
        numeroActual: 0,
        esFiscal: true,
        alertaPorcentaje: 80,
      },
      // FACTURA_DANIO Km 10.5
      {
        sucursalId: sucKm10.id,
        tipoDocumento: TipoDocumentoSerie.FACTURA_DANIO,
        serie: 'DAN',
        prefijo: 'FAC',
        plantilla: '{prefijo}-{serie}-{numero}',
        relleno: 6,
        numeroDesde: 1,
        numeroHasta: 999999,
        numeroActual: maxFacturaDanio,
        esFiscal: false,
        alertaPorcentaje: 80,
      },
      // RECIBO_CAJA Km 10.5
      {
        sucursalId: sucKm10.id,
        tipoDocumento: TipoDocumentoSerie.RECIBO_CAJA,
        serie: sucKm10.codigo === 'KM10' ? 'KM10' : 'CENTRAL',
        prefijo: 'RC',
        plantilla: '{prefijo}-{serie}-{numero}',
        relleno: 5,
        numeroDesde: 1,
        numeroHasta: 999999,
        numeroActual: maxRecibo,
        esFiscal: false,
        alertaPorcentaje: 80,
      },
      // RECIBO_CAJA Centroamérica
      {
        sucursalId: sucCA.id,
        tipoDocumento: TipoDocumentoSerie.RECIBO_CAJA,
        serie: 'CA',
        prefijo: 'RC',
        plantilla: '{prefijo}-{serie}-{numero}',
        relleno: 5,
        numeroDesde: 1,
        numeroHasta: 999999,
        numeroActual: 0,
        esFiscal: false,
        alertaPorcentaje: 80,
      },
      // NOTA_DEBITO (Empresa)
      {
        sucursalId: null,
        tipoDocumento: TipoDocumentoSerie.NOTA_DEBITO,
        serie: '001',
        prefijo: 'ND',
        plantilla: '{prefijo}-{numero}',
        relleno: 6,
        numeroDesde: 1,
        numeroHasta: 999999,
        numeroActual: maxNota,
        esFiscal: false,
        alertaPorcentaje: 80,
      },
      // COTIZACION (Empresa)
      {
        sucursalId: null,
        tipoDocumento: TipoDocumentoSerie.COTIZACION,
        serie: '001',
        prefijo: 'COT',
        plantilla: '{prefijo}-{numero}',
        relleno: 4,
        numeroDesde: 1,
        numeroHasta: 999999,
        numeroActual: maxCot,
        esFiscal: false,
        alertaPorcentaje: 80,
      },
      // CONTRATO (Empresa - Reinicia por año)
      {
        sucursalId: null,
        tipoDocumento: TipoDocumentoSerie.CONTRATO,
        serie: '001',
        prefijo: 'CTR',
        plantilla: '{prefijo}-{anio}-{numero}',
        relleno: 4,
        numeroDesde: 1,
        numeroHasta: 999999,
        numeroActual: maxCtr,
        reiniciaPorAnio: true,
        esFiscal: false,
        alertaPorcentaje: 80,
      },
    ];

    // Sembrar o actualizar respetando unicidad
    for (const sc of seriesConfig) {
      const existente = await prisma.serieDocumento.findFirst({
        where: {
          empresaId: empresa.id,
          sucursalId: sc.sucursalId,
          tipoDocumento: sc.tipoDocumento,
          estado: EstadoSerieDocumento.ACTIVA,
        },
      });

      if (existente) {
        // Asegurar que numeroActual nunca sea menor al máximo emitido
        const nuevoActual = Math.max(existente.numeroActual, sc.numeroActual);
        await prisma.serieDocumento.update({
          where: { id: existente.id },
          data: {
            numeroActual: nuevoActual,
            plantilla: existente.plantilla || sc.plantilla,
          },
        });
        console.log(
          `  🔁 Serie existente actualizada: ${sc.tipoDocumento} [${existente.serie}] (Actual: ${nuevoActual})`,
        );
      } else {
        const creada = await prisma.serieDocumento.create({
          data: {
            empresaId: empresa.id,
            sucursalId: sc.sucursalId,
            tipoDocumento: sc.tipoDocumento,
            serie: sc.serie,
            prefijo: sc.prefijo,
            plantilla: sc.plantilla,
            relleno: sc.relleno,
            numeroDesde: sc.numeroDesde,
            numeroHasta: sc.numeroHasta,
            numeroActual: sc.numeroActual,
            reiniciaPorAnio: (sc as any).reiniciaPorAnio || false,
            anioActual,
            esFiscal: sc.esFiscal,
            alertaPorcentaje: sc.alertaPorcentaje,
            estado: EstadoSerieDocumento.ACTIVA,
          },
        });
        console.log(
          `  ✨ Serie creada: ${sc.tipoDocumento} [${creada.serie}] (Desde: ${creada.numeroDesde}, Hasta: ${creada.numeroHasta}, Actual: ${creada.numeroActual})`,
        );
      }
    }
  }

  console.log('🎉 Siembra de series completada con éxito.');
}

if (require.main === module) {
  seedNumberingSeries()
    .catch((err) => {
      console.error('❌ Error en seed de numbering:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
