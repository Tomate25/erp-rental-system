import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as xlsx from 'xlsx';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const filePath = 'C:\\Users\\abdia\\Downloads\\CLIENTES BM.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // range: 1 skips the first row (index 0) and uses the second row (index 1) as headers
  const data = xlsx.utils.sheet_to_json<any>(sheet, { range: 1 });

  console.log(`Found ${data.length} records in Excel (excluding header).`);

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    throw new Error('No empresa found in DB. Please run seed first.');
  }

  // Delete previously imported clients to avoid duplicates
  console.log("Deleting existing clients...");
  await prisma.cliente.deleteMany({
    where: { empresaId: empresa.id }
  });

  let successCount = 0;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    const nombre = row['Nombre']?.toString().trim();
    if (!nombre) continue; // Skip empty rows
    
    // Id Cliente -> numeroCliente
    const numeroCliente = row['Id Cliente']?.toString().trim() || null;
    const cedula = row['Cédula']?.toString().trim() || null;
    const rfc = row['Ruc']?.toString().trim() || null;
    const vendedor = row['Vendedor']?.toString().trim() || null;
    const direccion = row['Dirección']?.toString().trim() || null;
    
    // Si no tiene correo, dejar nulo
    let email = row['Correo ']?.toString().trim();
    if (!email || email === '') {
      email = null;
    }
    
    const telMovistar = row['Telf.Movistar']?.toString().trim() || null;
    const telClaro = row['Tel.Claro']?.toString().trim() || null;
    const telConvencional = row['Tel.Convencional']?.toString().trim() || null;
    
    // Convertir a numero si existe, sino null
    let limiteCredito = null;
    if (row['Límite de Crédito']) {
      const rawLimit = row['Límite de Crédito'].toString().replace(/,/g, '');
      const parsed = parseFloat(rawLimit);
      if (!isNaN(parsed)) limiteCredito = parsed;
    }
    
    const condicionPago = row['Condición de Pago']?.toString().trim() || null;

    try {
      await prisma.cliente.create({
        data: {
          empresaId: empresa.id,
          numeroCliente,
          nombre,
          cedula,
          rfc,
          vendedor,
          direccion,
          emailFacturacion: email,
          telMovistar,
          telClaro,
          telConvencional,
          limiteCredito,
          condicionPago,
          // Guardar compatibilidad con los campos antiguos, o dejarlos null si la base de datos lo permite
          telefono: telMovistar || telClaro || telConvencional || null
        }
      });
      successCount++;
      if (successCount % 100 === 0) {
         console.log(`Imported ${successCount} clients...`);
      }
    } catch (e) {
      console.error(`Error importing client ${nombre}:`, e);
    }
  }

  console.log(`Finished importing. Successfully added ${successCount} clients.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
