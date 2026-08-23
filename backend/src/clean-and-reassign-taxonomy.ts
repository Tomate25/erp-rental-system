import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en .env');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- INSPECCIÓN Y LIMPIEZA DE CATEGORÍAS EN BASE DE DATOS ---');

  const officialCategoryNames = [
    'Línea Amarilla',
    'Compactación',
    'Equipos para Concreto',
    'Encofrado',
    'Energía e Iluminación',
    'Bombas y Agua',
    'Herramientas',
    'Andamios',
    'Seguridad Industrial',
    'Vehículos',
    'Infraestructura y Contenedores',
    'Accesorios y Repuestos'
  ];

  // 1. Asegurar que existan las 12 categorías oficiales
  for (const name of officialCategoryNames) {
    const exists = await prisma.categoria.findFirst({
      where: { nombre: { equals: name, mode: 'insensitive' } }
    });
    if (!exists) {
      await prisma.categoria.create({
        data: { nombre: name, isLineaAmarilla: name === 'Línea Amarilla' }
      });
      console.log(`Creada categoría oficial missing: "${name}"`);
    }
  }

  // Reload official categories
  const officialCats = await prisma.categoria.findMany({
    where: { nombre: { in: officialCategoryNames } }
  });
  const officialMap = new Map<string, string>();
  officialCats.forEach(c => officialMap.set(c.nombre.toLowerCase(), c.id));

  // 2. Traer todas las categorías con sus equipos
  const dbCategories = await prisma.categoria.findMany({
    include: { equipos: true }
  });

  console.log(`Total categorías en DB: ${dbCategories.length}`);

  for (const cat of dbCategories) {
    // Si no es una de las 12 exactas oficiales (caso insensible)
    const isOfficial = officialCategoryNames.some(n => n.toLowerCase() === cat.nombre.trim().toLowerCase());
    
    if (!isOfficial) {
      console.log(`Categoría no oficial a migrar: "${cat.nombre}" (${cat.equipos.length} equipos)...`);
      
      let targetName = 'Accesorios y Repuestos';
      const upperName = cat.nombre.toUpperCase();

      if (upperName.includes('ANDAMIO') && upperName.includes('SEGURIDAD')) {
        targetName = 'Andamios';
      } else if (upperName.includes('ANDAMIO')) {
        targetName = 'Andamios';
      } else if (upperName.includes('SEGURIDAD') || upperName.includes('ARNES')) {
        targetName = 'Seguridad Industrial';
      } else if (upperName.includes('COMPACTA')) {
        targetName = 'Compactación';
      } else if (upperName.includes('CONCRETO') || upperName.includes('MEZCLA')) {
        targetName = 'Equipos para Concreto';
      } else if (upperName.includes('ENCOFRADO') || upperName.includes('PLACA')) {
        targetName = 'Encofrado';
      } else if (upperName.includes('ENERGIA') || upperName.includes('GENERADOR') || upperName.includes('ILUMINA')) {
        targetName = 'Energía e Iluminación';
      } else if (upperName.includes('BOMBA') || upperName.includes('AGUA')) {
        targetName = 'Bombas y Agua';
      } else if (upperName.includes('HERRAMIENTA') || upperName.includes('DEMOLICION')) {
        targetName = 'Herramientas';
      } else if (upperName.includes('AMARILLA') || upperName.includes('PESADA')) {
        targetName = 'Línea Amarilla';
      } else if (upperName.includes('VEHICULO') || upperName.includes('TRANSPORTE') || upperName.includes('CAMION')) {
        targetName = 'Vehículos';
      } else if (upperName.includes('CONTENEDOR') || upperName.includes('OFICINA')) {
        targetName = 'Infraestructura y Contenedores';
      }

      const targetCatId = officialMap.get(targetName.toLowerCase())!;

      // Subcategoría por defecto
      const subcat = await prisma.subcategoria.findFirst({
        where: { categoriaId: targetCatId }
      });

      if (cat.equipos.length > 0) {
        await prisma.equipo.updateMany({
          where: { categoriaId: cat.id },
          data: {
            categoriaId: targetCatId,
            subcategoriaId: subcat ? subcat.id : null
          }
        });
        console.log(`   └─ Reasignados ${cat.equipos.length} equipos a "${targetName}"`);
      }

      // Borrar la categoría vieja
      try {
        await prisma.subcategoria.deleteMany({ where: { categoriaId: cat.id } });
        await prisma.categoria.delete({ where: { id: cat.id } });
        console.log(`   └─ Eliminada categoría obsoleta "${cat.nombre}".`);
      } catch (err: any) {
        console.error(`   └─ Error al eliminar categoría "${cat.nombre}":`, err.message);
      }
    }
  }

  // 3. Verificar si hay equipos asociados a la categoría official Andamios
  const andamiosCatId = officialMap.get('andamios')!;
  const andamiosSubcat = await prisma.subcategoria.findFirst({
    where: { categoriaId: andamiosCatId, nombre: 'Andamio Estándar' }
  });

  // Re-chequear todos los equipos con modelo o descripción de andamio y asegurar que estén en "Andamios"
  const andamioEquipos = await prisma.equipo.findMany({
    where: {
      OR: [
        { modelo: { contains: 'ANDAMIO', mode: 'insensitive' } },
        { descripcion: { contains: 'ANDAMIO', mode: 'insensitive' } }
      ]
    }
  });

  for (const eq of andamioEquipos) {
    if (eq.categoriaId !== andamiosCatId) {
      await prisma.equipo.update({
        where: { id: eq.id },
        data: {
          categoriaId: andamiosCatId,
          subcategoriaId: andamiosSubcat ? andamiosSubcat.id : eq.subcategoriaId
        }
      });
      console.log(`Re-asignado equipo de andamio "${eq.modelo}" a la categoría oficial "Andamios".`);
    }
  }

  console.log('✅ Proceso de migración y limpieza de categorías finalizado.');
}

main()
  .catch((e) => {
    console.error('Error en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
