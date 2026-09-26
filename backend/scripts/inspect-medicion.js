const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.equipo.groupBy({
    by: ['tipoMedicionCombustible'],
    _count: true
  });
  console.log('Equipos por tipo medicion:', counts);

  const distinctDesc = await prisma.$queryRaw`
    SELECT DISTINCT UPPER(TRIM(descripcion)) as desc_norm, tipo_medicion_combustible
    FROM equipos 
    ORDER BY desc_norm
    LIMIT 30;
  `;
  console.log('Distinct descripciones sample:', distinctDesc);

  await prisma.$disconnect();
}

main().catch(console.error);
