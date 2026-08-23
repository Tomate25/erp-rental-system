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

const OFFICIAL_TAXONOMY: { [catName: string]: string[] } = {
  'Línea Amarilla': [
    'Minicargadores',
    'Retroexcavadoras',
    'Excavadoras',
    'Bulldozers',
    'Motoniveladoras',
    'Cargadores Frontales',
    'Rodillos / Compactadores Grandes'
  ],
  'Compactación': [
    'Compactadora Tipo Canguro',
    'Vibroplanchas',
    'Rodillos de Empuje',
    'Rodillos Hombre a Bordo'
  ],
  'Equipos para Concreto': [
    'Allanadoras',
    'Mezcladoras',
    'Vibradores de Concreto',
    'Regletas Vibratorias',
    'Revocadoras de Mortero',
    'Bateas para Concreto',
    'Platos para Allanadora',
    'Aspas de Allanadora'
  ],
  'Encofrado': [
    'Placas de Encofrado',
    'Esquineros',
    'Alineadores',
    'Cuñas',
    'Barules',
    'Flotas de Canal',
    'Tensores',
    'Extensiones',
    'Fillers',
    'Placas Metálicas',
    'Accesorios de Encofrado'
  ],
  'Energía e Iluminación': [
    'Generadores',
    'Generadores Soldadores',
    'Torres de Iluminación',
    'Extensiones Eléctricas'
  ],
  'Bombas y Agua': [
    'Bombas de Agua',
    'Bombas Traga Sólidos',
    'Hidrolavadoras',
    'Hidroestáticas'
  ],
  'Herramientas': [
    'Martillos Demoledores',
    'Rotomartillos',
    'Taladros',
    'Pulidoras',
    'Chicharras Eléctricas',
    'Chicharras Neumáticas',
    'Chicharras Hidráulicas',
    'Taladros Saca Núcleos',
    'Brocas',
    'Compresores',
    'Mangueras Neumáticas'
  ],
  'Andamios': [
    'Andamio Estándar',
    'Andamio Industrial',
    'Andamio de Carga',
    'Plataformas',
    'Rodos de Andamio',
    'Escaleras de Andamio',
    'Niveladores',
    'Platos Base',
    'Cabezal en U',
    'Prensas',
    'Accesorios de Andamio'
  ],
  'Seguridad Industrial': [
    'Arneses',
    'Líneas de Vida'
  ],
  'Vehículos': [
    'Camiones',
    'Camionetas',
    'Vehículos de Carga'
  ],
  'Infraestructura y Contenedores': [
    'Contenedores Oficina',
    'Contenedores Climatizados'
  ],
  'Accesorios y Repuestos': [
    'Filtros',
    'Repuestos',
    'Piezas y Consumibles'
  ]
};

async function main() {
  console.log('=== LIMPIEZA ABSOLUTA DE CATEGORÍAS DUPLICADAS Y CLASIFICACIÓN DE SUBCATEGORÍAS ===');

  const officialCatMap = new Map<string, string>(); // Nombre oficial exacto -> Categoria ID

  // 1. Crear o localizar la versión canónica de cada una de las 12 categorías
  for (const catName of Object.keys(OFFICIAL_TAXONOMY)) {
    let cat = await prisma.categoria.findFirst({
      where: { nombre: catName }
    });

    if (!cat) {
      cat = await prisma.categoria.create({
        data: {
          nombre: catName,
          isLineaAmarilla: catName === 'Línea Amarilla'
        }
      });
      console.log(`+ Creada categoría oficial: "${catName}"`);
    }

    officialCatMap.set(catName.toLowerCase(), cat.id);

    // Garantizar sus subcategorías oficiales
    for (const subName of OFFICIAL_TAXONOMY[catName]) {
      await prisma.subcategoria.upsert({
        where: {
          categoriaId_nombre: {
            categoriaId: cat.id,
            nombre: subName
          }
        },
        update: {},
        create: {
          categoriaId: cat.id,
          nombre: subName
        }
      });
    }
  }

  // 2. Traer todas las categorías con sus equipos
  const dbCategories = await prisma.categoria.findMany({
    include: { equipos: true }
  });

  const validIds = new Set(Array.from(officialCatMap.values()));

  for (const cat of dbCategories) {
    if (!validIds.has(cat.id)) {
      console.log(`Fusionando categoría no canónica: "${cat.nombre}" (${cat.equipos.length} equipos)...`);
      
      let targetName = 'Accesorios y Repuestos';
      const norm = cat.nombre.toUpperCase();

      if (norm.includes('ANDAMIO')) {
        targetName = 'Andamios';
      } else if (norm.includes('SEGURIDAD') || norm.includes('ARNES')) {
        targetName = 'Seguridad Industrial';
      } else if (norm.includes('COMPACTA')) {
        targetName = 'Compactación';
      } else if (norm.includes('CONCRETO') || norm.includes('MEZCLA')) {
        targetName = 'Equipos para Concreto';
      } else if (norm.includes('ENCOFRADO') || norm.includes('PLACA')) {
        targetName = 'Encofrado';
      } else if (norm.includes('ENERGIA') || norm.includes('GENERADOR') || norm.includes('ILUMINA')) {
        targetName = 'Energía e Iluminación';
      } else if (norm.includes('BOMBA') || norm.includes('AGUA')) {
        targetName = 'Bombas y Agua';
      } else if (norm.includes('HERRAMIENTA') || norm.includes('DEMOLICION')) {
        targetName = 'Herramientas';
      } else if (norm.includes('AMARILLA') || norm.includes('PESADA')) {
        targetName = 'Línea Amarilla';
      } else if (norm.includes('VEHICULO') || norm.includes('TRANSPORTE') || norm.includes('CAMION')) {
        targetName = 'Vehículos';
      } else if (norm.includes('CONTENEDOR') || norm.includes('OFICINA')) {
        targetName = 'Infraestructura y Contenedores';
      }

      const targetId = officialCatMap.get(targetName.toLowerCase())!;

      if (cat.equipos.length > 0) {
        await prisma.equipo.updateMany({
          where: { categoriaId: cat.id },
          data: { categoriaId: targetId }
        });
        console.log(`   └─ Reasignados ${cat.equipos.length} equipos de "${cat.nombre}" a "${targetName}"`);
      }

      // Eliminar categoría duplicada
      try {
        await prisma.subcategoria.deleteMany({ where: { categoriaId: cat.id } });
        await prisma.categoria.delete({ where: { id: cat.id } });
        console.log(`   └─ Eliminada categoría repetida "${cat.nombre}"`);
      } catch (err: any) {
        console.error(`   └─ Error al borrar "${cat.nombre}":`, err.message);
      }
    }
  }

  // 3. Asignar subcategoría inteligente a TODOS los equipos en el inventario
  console.log('\n--- Asignando Subcategorías Inteligentes a Equipos ---');
  const allEquipos = await prisma.equipo.findMany({
    include: { categoria: true }
  });

  let updatedCount = 0;

  for (const eq of allEquipos) {
    const catName = eq.categoria?.nombre || 'Accesorios y Repuestos';
    const subcats = await prisma.subcategoria.findMany({
      where: { categoriaId: eq.categoriaId }
    });

    if (subcats.length === 0) continue;

    const textToMatch = `${eq.modelo} ${eq.descripcion || ''} ${eq.codigo || ''}`.toUpperCase();
    let matchedSub = subcats[0];

    // Reglas de coincidencia específicas por texto
    if (catName === 'Andamios') {
      if (textToMatch.includes('INDUSTRIAL')) matchedSub = subcats.find(s => s.nombre.includes('Industrial')) || matchedSub;
      else if (textToMatch.includes('CARGA')) matchedSub = subcats.find(s => s.nombre.includes('Carga')) || matchedSub;
      else if (textToMatch.includes('PLATAFORMA')) matchedSub = subcats.find(s => s.nombre.includes('Plataformas')) || matchedSub;
      else if (textToMatch.includes('RODO')) matchedSub = subcats.find(s => s.nombre.includes('Rodos')) || matchedSub;
      else if (textToMatch.includes('ESCALERA')) matchedSub = subcats.find(s => s.nombre.includes('Escaleras')) || matchedSub;
      else if (textToMatch.includes('NIVELADOR')) matchedSub = subcats.find(s => s.nombre.includes('Niveladores')) || matchedSub;
      else if (textToMatch.includes('PLATO')) matchedSub = subcats.find(s => s.nombre.includes('Platos Base')) || matchedSub;
      else if (textToMatch.includes('CABEZAL') || textToMatch.includes(' EN U')) matchedSub = subcats.find(s => s.nombre.includes('Cabezal')) || matchedSub;
      else if (textToMatch.includes('PRENSA')) matchedSub = subcats.find(s => s.nombre.includes('Prensas')) || matchedSub;
      else matchedSub = subcats.find(s => s.nombre.includes('Estándar')) || matchedSub;
    } else if (catName === 'Línea Amarilla') {
      if (textToMatch.includes('MINI') || textToMatch.includes('BOBCAT')) matchedSub = subcats.find(s => s.nombre.includes('Minicargadores')) || matchedSub;
      else if (textToMatch.includes('RETRO') || textToMatch.includes('BACKHOE')) matchedSub = subcats.find(s => s.nombre.includes('Retroexcavadoras')) || matchedSub;
      else if (textToMatch.includes('EXCAVADORA')) matchedSub = subcats.find(s => s.nombre.includes('Excavadoras')) || matchedSub;
      else if (textToMatch.includes('BULLDOZER')) matchedSub = subcats.find(s => s.nombre.includes('Bulldozers')) || matchedSub;
      else if (textToMatch.includes('MOTONIVELADORA')) matchedSub = subcats.find(s => s.nombre.includes('Motoniveladoras')) || matchedSub;
      else if (textToMatch.includes('FRONTAL')) matchedSub = subcats.find(s => s.nombre.includes('Frontales')) || matchedSub;
      else matchedSub = subcats.find(s => s.nombre.includes('Rodillos')) || matchedSub;
    } else if (catName === 'Compactación') {
      if (textToMatch.includes('CANGURO') || textToMatch.includes('RANA')) matchedSub = subcats.find(s => s.nombre.includes('Canguro')) || matchedSub;
      else if (textToMatch.includes('VIBRO') || textToMatch.includes('PLANCHA')) matchedSub = subcats.find(s => s.nombre.includes('Vibroplanchas')) || matchedSub;
      else if (textToMatch.includes('HOMBRE') || textToMatch.includes('ABORDO')) matchedSub = subcats.find(s => s.nombre.includes('Hombre')) || matchedSub;
      else matchedSub = subcats.find(s => s.nombre.includes('Empuje')) || matchedSub;
    } else if (catName === 'Equipos para Concreto') {
      if (textToMatch.includes('MEZCLA')) matchedSub = subcats.find(s => s.nombre.includes('Mezcladoras')) || matchedSub;
      else if (textToMatch.includes('VIBRA')) matchedSub = subcats.find(s => s.nombre.includes('Vibradores')) || matchedSub;
      else if (textToMatch.includes('ALLANA')) matchedSub = subcats.find(s => s.nombre.includes('Allanadoras')) || matchedSub;
      else if (textToMatch.includes('REGLETA')) matchedSub = subcats.find(s => s.nombre.includes('Regletas')) || matchedSub;
      else if (textToMatch.includes('REVOCA')) matchedSub = subcats.find(s => s.nombre.includes('Revocadoras')) || matchedSub;
      else if (textToMatch.includes('BATEA')) matchedSub = subcats.find(s => s.nombre.includes('Bateas')) || matchedSub;
    } else if (catName === 'Encofrado') {
      if (textToMatch.includes('ESQUINERO')) matchedSub = subcats.find(s => s.nombre.includes('Esquineros')) || matchedSub;
      else if (textToMatch.includes('ALINEADOR')) matchedSub = subcats.find(s => s.nombre.includes('Alineadores')) || matchedSub;
      else if (textToMatch.includes('CUÑA')) matchedSub = subcats.find(s => s.nombre.includes('Cuñas')) || matchedSub;
      else if (textToMatch.includes('BARUL')) matchedSub = subcats.find(s => s.nombre.includes('Barules')) || matchedSub;
      else if (textToMatch.includes('FLOTA')) matchedSub = subcats.find(s => s.nombre.includes('Flotas')) || matchedSub;
      else if (textToMatch.includes('TENSOR')) matchedSub = subcats.find(s => s.nombre.includes('Tensores')) || matchedSub;
      else if (textToMatch.includes('EXTENSION')) matchedSub = subcats.find(s => s.nombre.includes('Extensiones')) || matchedSub;
      else if (textToMatch.includes('FILLER')) matchedSub = subcats.find(s => s.nombre.includes('Fillers')) || matchedSub;
      else matchedSub = subcats.find(s => s.nombre.includes('Placas de Encofrado')) || matchedSub;
    }

    await prisma.equipo.update({
      where: { id: eq.id },
      data: { subcategoriaId: matchedSub.id }
    });

    updatedCount++;
  }

  console.log(`✅ ${updatedCount} equipos clasificados exitosamente con subcategorías asignadas.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
