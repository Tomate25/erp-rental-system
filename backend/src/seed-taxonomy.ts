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

const taxonomyData = [
  {
    nombre: 'Línea Amarilla',
    descripcion: 'Maquinaria pesada para movimiento de tierra y construcción pesada.',
    isLineaAmarilla: true,
    subcategorias: [
      'Minicargadores',
      'Retroexcavadoras',
      'Excavadoras',
      'Bulldozers',
      'Motoniveladoras',
      'Cargadores Frontales',
      'Rodillos / Compactadores Grandes'
    ]
  },
  {
    nombre: 'Compactación',
    descripcion: 'Equipos ligeros y medianos de compactación de suelos y rasantes.',
    isLineaAmarilla: false,
    subcategorias: [
      'Compactadora Tipo Canguro',
      'Vibroplanchas',
      'Rodillos de Empuje',
      'Rodillos Hombre a Bordo'
    ]
  },
  {
    nombre: 'Equipos para Concreto',
    descripcion: 'Mezcladoras, vibradores, allanadoras y accesorios de vaciado.',
    isLineaAmarilla: false,
    subcategorias: [
      'Allanadoras',
      'Mezcladoras',
      'Vibradores de Concreto',
      'Regletas Vibratorias',
      'Revocadoras de Mortero',
      'Bateas para Concreto',
      'Platos para Allanadora',
      'Aspas de Allanadora'
    ]
  },
  {
    nombre: 'Encofrado',
    descripcion: 'Sistemas de encofrado, placas metálicas, esquineros y accesorios.',
    isLineaAmarilla: false,
    subcategorias: [
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
    ]
  },
  {
    nombre: 'Energía e Iluminación',
    descripcion: 'Generadores eléctricos, torres de luz y soldadoras.',
    isLineaAmarilla: false,
    subcategorias: [
      'Generadores',
      'Generadores Soldadores',
      'Torres de Iluminación',
      'Extensiones Eléctricas'
    ]
  },
  {
    nombre: 'Bombas y Agua',
    descripcion: 'Equipos de achique, bombas de agua, hidrolavadoras e hidroestáticas.',
    isLineaAmarilla: false,
    subcategorias: [
      'Bombas de Agua',
      'Bombas Traga Sólidos',
      'Hidrolavadoras',
      'Hidroestáticas'
    ]
  },
  {
    nombre: 'Herramientas',
    descripcion: 'Herramientas eléctricas, neumáticas e hidráulicas para obra.',
    isLineaAmarilla: false,
    subcategorias: [
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
    ]
  },
  {
    nombre: 'Andamios',
    descripcion: 'Sistemas de andamiaje estándar, industrial, carga y accesorios.',
    isLineaAmarilla: false,
    subcategorias: [
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
    ]
  },
  {
    nombre: 'Seguridad Industrial',
    descripcion: 'Equipos de protección individual, arneses y líneas de vida.',
    isLineaAmarilla: false,
    subcategorias: [
      'Arneses',
      'Líneas de Vida'
    ]
  },
  {
    nombre: 'Vehículos',
    descripcion: 'Camiones de transporte, camionetas y vehículos de carga.',
    isLineaAmarilla: false,
    subcategorias: [
      'Camiones',
      'Camionetas',
      'Vehículos de Carga'
    ]
  },
  {
    nombre: 'Infraestructura y Contenedores',
    descripcion: 'Contenedores oficina, casetas y módulos climatizados.',
    isLineaAmarilla: false,
    subcategorias: [
      'Contenedores Oficina',
      'Contenedores Climatizados'
    ]
  },
  {
    nombre: 'Accesorios y Repuestos',
    descripcion: 'Consumibles, repuestos de mantenimiento y piezas de recambio.',
    isLineaAmarilla: false,
    subcategorias: [
      'Filtros',
      'Repuestos',
      'Piezas y Consumibles'
    ]
  }
];

async function main() {
  console.log('Iniciando poblamiento de Taxonomía ERP (12 Categorías Principales + Subcategorías)...');

  for (const catData of taxonomyData) {
    const categoria = await prisma.categoria.upsert({
      where: { nombre: catData.nombre },
      update: {
        descripcion: catData.descripcion,
        isLineaAmarilla: catData.isLineaAmarilla
      },
      create: {
        nombre: catData.nombre,
        descripcion: catData.descripcion,
        isLineaAmarilla: catData.isLineaAmarilla
      }
    });

    console.log(`Categoría: ${categoria.nombre}`);

    for (const subNombre of catData.subcategorias) {
      await prisma.subcategoria.upsert({
        where: {
          categoriaId_nombre: {
            categoriaId: categoria.id,
            nombre: subNombre
          }
        },
        update: {},
        create: {
          categoriaId: categoria.id,
          nombre: subNombre
        }
      });
      console.log(`   └─ Subcategoría: ${subNombre}`);
    }
  }

  console.log('✅ Taxonomía de Categorías y Subcategorías poblada exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error al poblar taxonomía:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
