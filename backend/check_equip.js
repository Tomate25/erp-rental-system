const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.equipo.findMany().then(r => console.log('Equipos:', r.length)).finally(() => prisma.$disconnect());
