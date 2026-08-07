import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================
// INVENTARIO BM CONSTRUCCIONES - JUNIO 2026 (Hoja1)
// ============================================================
const inventario = [
  { codigo: '01-02', descripcion: 'COMPACTADORA MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'EMR75R', serie: 'H0753230599' },
  { codigo: '01-03', descripcion: 'COMPACTADORA MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'MR70H', serie: 'H07042303858' },
  { codigo: '01-05', descripcion: 'COMPACTADORA MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'MR75R', serie: 'H07532313938' },
  { codigo: '01-06', descripcion: 'COMPACTADORA WAKER', cantidad: 1, marca: 'WAKER NEUSON', modelo: 'BS50-4AS', serie: '11755386' },
  { codigo: '01-08', descripcion: 'COMPACTADORA WAKER', cantidad: 1, marca: 'WAKER NEUSON', modelo: 'BS60-4AS', serie: '11773056' },
  { codigo: '01-10', descripcion: 'COMPACTADORA MBW', cantidad: 1, marca: 'MBW', modelo: 'MOTOR EH122D', serie: '' },
  { codigo: '01-11', descripcion: 'COMPACTADORA MBW', cantidad: 1, marca: 'MBW', modelo: 'MOTOR EH122D', serie: '' },
  { codigo: '01-15', descripcion: 'COMPACTADORA MBW', cantidad: 1, marca: 'MBW', modelo: 'R480', serie: '' },
  { codigo: '01-16', descripcion: 'COMPACTADORA WAKER', cantidad: 1, marca: 'WAKER NEUSON', modelo: '*BS50-4AS', serie: '11755385' },
  { codigo: '01-17', descripcion: 'COMPACTADORA MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'MR70H', serie: 'H07042303908' },
  { codigo: '01-18', descripcion: 'COMPACTADORA WAKER', cantidad: 1, marca: 'WAKER NEUSON', modelo: 'BS60-4AS', serie: '11773057' },
  { codigo: '01-19', descripcion: 'COMPACTADORA SIMAQ', cantidad: 1, marca: 'SIMAQ', modelo: 'SQ60PRO', serie: '24060044' },
  { codigo: '01-21', descripcion: 'COMPACTADORA ENAR DIESEL', cantidad: 1, marca: 'ENAR', modelo: 'PH80YD', serie: '21782403' },
  { codigo: '01-22', descripcion: 'COMPACTADORA MIKASA', cantidad: 1, marca: 'MIKASA', modelo: 'MTX-60HF', serie: 'Z1259' },
  { codigo: '01-24', descripcion: 'COMPACTADORA MBW', cantidad: 1, marca: 'MBW', modelo: 'R480', serie: '' },
  { codigo: '01-25', descripcion: 'COMPACTADORA ENAR', cantidad: 1, marca: 'ENAR', modelo: 'PH70E', serie: '' },
  { codigo: '01-26', descripcion: 'COMPACTADORA ENAR', cantidad: 1, marca: 'ENAR', modelo: 'PH70E', serie: '' },
  { codigo: '01-27', descripcion: 'COMPACTADORA ENAR', cantidad: 1, marca: 'ENAR', modelo: 'PH70E', serie: '' },
  { codigo: '01-28', descripcion: 'COMPACTADORA MBW', cantidad: 1, marca: 'MBW', modelo: 'R480', serie: '' },
  { codigo: '01-31', descripcion: 'VIBROPLANCHA SIMAQ', cantidad: 1, marca: 'SIMAQ', modelo: 'SQ15PRO', serie: '' },
  { codigo: '01-32', descripcion: 'VIBROPLANCHA STANLEY', cantidad: 1, marca: 'STANLEY', modelo: 'SFP1250', serie: '12215389' },
  { codigo: '01-33', descripcion: 'VIBROPLANCHA ENAR', cantidad: 1, marca: 'ENAR', modelo: '4000W  5.5 HP', serie: '22008420053' },
  { codigo: '01-34', descripcion: 'RODO DE EMPUJE SENCILLO CIPSA 0.5 TM', cantidad: 1, marca: 'CIPSA', modelo: 'PR8AR9', serie: 'PR81503010' },
  { codigo: '01-35', descripcion: 'RODO DE EMPUJE SENCILLO  CIPSA 0.5 TM', cantidad: 1, marca: 'CIPSA', modelo: 'PR8AR9', serie: 'PR81211007' },
  { codigo: '01-37', descripcion: 'RODO DE EMPUJE DOBLE NO ARTICULADO 3/4 TM', cantidad: 1, marca: 'MPOWER', modelo: 'RWY L32', serie: 'AMARILLO' },
  { codigo: '01-38', descripcion: 'RODO DE EMPUJE DOBLE ARTICULADO 3/4 TM', cantidad: 1, marca: 'MPOWER', modelo: 'RWL35', serie: '37318081701A' },
  { codigo: '01-39', descripcion: 'RODO HOMBRE A BORDO 0.80 TM', cantidad: 1, marca: 'SIMAQ', modelo: 'RWYL41', serie: '31612903203A' },
  { codigo: '01-40', descripcion: 'RODO HOMBRE A BORDO 0.80 TM', cantidad: 1, marca: 'SIMAQ', modelo: 'SQRDL41', serie: '31640504210A' },
  { codigo: '01-41', descripcion: 'RODO HOMBRE A BORDO 1.5 TM', cantidad: 1, marca: 'SIMAQ', modelo: 'RWYL51', serie: '21530703201A' },
  { codigo: '01-42', descripcion: 'RODO HOMBRE A BORDO 1.5 TM', cantidad: 1, marca: 'SIMAQ', modelo: 'RWYL51', serie: '21591203202A' },
  { codigo: '01-43', descripcion: 'VIBROPLANCHA ENAR', cantidad: 1, marca: 'ENAR', modelo: '16DGHW', serie: '' },
  { codigo: '01-44', descripcion: 'RODO DE EMPUJE DOBLE ARTICULADO 3/4 TM', cantidad: 1, marca: 'SIMAQ', modelo: 'RWYL34BT', serie: '22422072206A' },
  { codigo: '01-45', descripcion: 'RODO DE EMPUJE DOBLE ARTICULADO 3/4 TM', cantidad: 1, marca: 'SIMAQ', modelo: 'RWYL34BT', serie: '' },
  { codigo: '01-46', descripcion: 'RODO DE EMPUJE DOBLE ARTICULADO 3/4 TM', cantidad: 1, marca: 'SIMAQ', modelo: 'SRQDWB34', serie: '22430604205A' },
  { codigo: '01-47', descripcion: 'COMPACTADORA SIMAQ', cantidad: 1, marca: 'SIMAQ', modelo: 'SQ60PRO', serie: '24070017' },
  { codigo: '01-48', descripcion: 'COMPACTADORA SIMAQ', cantidad: 1, marca: 'SIMAQ', modelo: 'SQ60PRO', serie: '24070019' },
  { codigo: '01-49', descripcion: 'COMPACTADORA SIMAQ', cantidad: 1, marca: 'SIMAQ', modelo: 'SQ60PRO', serie: '24070059' },
  { codigo: '01-50', descripcion: 'COMPACTADORA  MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'MR75R', serie: 'H0753230585' },
  { codigo: '01-51', descripcion: 'COMPACTADORA MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'MR75R', serie: '' },
  { codigo: '01-53', descripcion: 'COMPACTADORA SIMAQ', cantidad: 1, marca: 'SIMAQ', modelo: 'SQ60PRO', serie: '24115227' },
  { codigo: '01-54', descripcion: 'COMPACTADORA SIMAQ', cantidad: 1, marca: 'SIMAQ', modelo: 'SQ60PRO', serie: '24115169' },
  { codigo: '01-55', descripcion: 'VIBROPLANCHA HUSQVARNA', cantidad: 1, marca: 'HUSQVARNA', modelo: 'LFV-80', serie: '202512100109' },
  { codigo: '01-56', descripcion: 'COMPACTADORA HUSQVARNA', cantidad: 1, marca: 'HUSQVARNA', modelo: 'LT6005', serie: '202444100191' },
  { codigo: '01-57', descripcion: 'COMPACTADORA HUSQVARNA', cantidad: 1, marca: 'HUSQVARNA', modelo: 'LT6005', serie: '202444100243' },
  { codigo: '01-58', descripcion: 'COMPACTADORA HUSQVARNA', cantidad: 1, marca: 'HUSQVARNA', modelo: 'LT6005', serie: '202443100072' },
  { codigo: '01-59', descripcion: 'RODO HOMBRE A BORDO JCB 3TM', cantidad: 1, marca: 'JCB', modelo: '2.7 TM', serie: 'CT260' },
  { codigo: '01-60', descripcion: 'RODO DE EMPUJE SENCILLO CIPSA 0.5 TM .', cantidad: 1, marca: 'CIPSA', modelo: 'PR-8A/0.5 TM', serie: 'PR8241003' },
  { codigo: '01-61', descripcion: 'RODO DE EMPUJE SENCILLO CIPSA 0.5 TM', cantidad: 1, marca: 'CIPSA', modelo: 'PR8AR9', serie: 'PR81402021' },
  { codigo: '01-62', descripcion: 'VIBROPLANCHA WEBER', cantidad: 1, marca: 'WEBER', modelo: 'CR3', serie: '31139' },
  { codigo: '01-63', descripcion: 'COMPACTADORA WEBER', cantidad: 1, marca: 'WEBER', modelo: 'SRV660', serie: '20107983' },
  { codigo: '01-64', descripcion: 'COMPACTADORA WEBER', cantidad: 1, marca: 'WEBER', modelo: 'SRV660', serie: '20107984' },
  { codigo: '01-65', descripcion: 'COMPACTADORA WEBER', cantidad: 1, marca: 'WEBER', modelo: 'SRV660', serie: '20107985' },
  { codigo: '02-01', descripcion: 'ALLANADORA MPOWER', cantidad: 1, marca: 'MPOWER', modelo: 'JC436', serie: 'F2301052012' },
  { codigo: '02-02', descripcion: 'ALLANADORA ENAR TIFON 36"', cantidad: 1, marca: 'ENAR', modelo: 'TIFON909', serie: '24257801' },
  { codigo: '02-06', descripcion: 'CORTADORA MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'M-20-4', serie: 'Q020124105' },
  { codigo: '02-08', descripcion: 'VIBRADOR ELECTRICO MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'MVE2501-38', serie: '' },
  { codigo: '02-10', descripcion: 'VIBRADOR ELECTRICO ENAR', cantidad: 1, marca: 'ENAR', modelo: 'DINGO(ROSCADO)', serie: '24030905' },
  { codigo: '02-11', descripcion: 'VIBRADOR ELECTRICO ENAR', cantidad: 1, marca: 'ENAR', modelo: 'DINGO(ROSCADO)', serie: '24040303' },
  { codigo: '02-13', descripcion: 'VIBRADOR COMBUSTION WAKER', cantidad: 1, marca: 'WAKER NEUSON', modelo: 'A5000', serie: '' },
  { codigo: '02-14', descripcion: 'VIBRADOR COMBUSTION CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'MVMP6.5', serie: '' },
  { codigo: '02-15', descripcion: 'VIBRADOR COMBUSTION CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'MVMP6.5', serie: '' },
  { codigo: '02-16', descripcion: 'VIBRADOR COMBUSTION CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'MVMP6.5', serie: 'MV2311107' },
  { codigo: '02-17', descripcion: 'VIBRADOR ELECTRICO ENAR', cantidad: 1, marca: 'ENAR', modelo: 'DINGO 115V', serie: '' },
  { codigo: '02-18', descripcion: 'VIBRADOR ELECTRICO ENAR', cantidad: 1, marca: 'ENAR', modelo: 'DINGO 115V', serie: '' },
  { codigo: '02-19', descripcion: 'VIBRADOR ELECTRICO CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'VE3HP', serie: '' },
  { codigo: '02-20', descripcion: 'MESCLADORA 2 SACOS CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'M20SMMP13A', serie: 'MDSM2102006' },
  { codigo: '02-21', descripcion: 'MESCLADORA 2 SACOS CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'M20SMMP13A', serie: 'MDSM2102012' },
  { codigo: '02-22', descripcion: 'MESCLADORA 1 SACO CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'ULTRAK9A', serie: 'UM2405244' },
  { codigo: '02-24', descripcion: 'MESCLADORA 1 SACO CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'ULTRAHJL9A', serie: 'UM2104517' },
  { codigo: '02-26', descripcion: 'MESCLADORA 2 SACOS JOPER', cantidad: 1, marca: 'JOPER', modelo: 'J1001', serie: 'B59880' },
  { codigo: '02-27', descripcion: 'MESCLADORA 2 SACOS JOPER', cantidad: 1, marca: 'JOPER', modelo: 'J1001', serie: 'B59877' },
  { codigo: '02-30', descripcion: 'MESCLADORA 1 SACO CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'ULTRAPHJL9A', serie: 'UP2309023' },
  { codigo: '02-32', descripcion: 'ALLANADORA SIMAQ', cantidad: 1, marca: 'SIMAQ', modelo: 'SQ36PRO', serie: '' },
  { codigo: '02-33', descripcion: 'ALLANADORA WAKER NEUSON', cantidad: 1, marca: 'WAKER NEUSON', modelo: 'MOTOR HONDA', serie: '' },
  { codigo: '02-34', descripcion: 'REVOCADORA DE MORTERO', cantidad: 7, marca: 'N/D', modelo: '6 LITRO', serie: '' },
  { codigo: '02-36', descripcion: 'VIBRADOR ELECTRICO MASALTA', cantidad: 1, marca: 'MASALTA', modelo: 'MVE2501-38', serie: '' },
  { codigo: '02-37', descripcion: 'PISTOLA DE IMPACTO HILTI', cantidad: 1, marca: 'HILTI', modelo: 'DXE37', serie: '' },
  { codigo: '02-115', descripcion: 'PLACA 4X4', cantidad: 0, marca: 'SWYMONS', modelo: '4X4', serie: '' },
  { codigo: '02-83', descripcion: 'PLACA 4X6', cantidad: 1, marca: 'SWYMONS', modelo: '4X6', serie: '' },
  { codigo: '02-38', descripcion: 'PLACA 4X8', cantidad: 8, marca: 'SWYMONS', modelo: '4X8', serie: '' },
  { codigo: '02-39', descripcion: 'PLACA 6X4', cantidad: 1, marca: 'SWYMONS', modelo: '6X4', serie: '' },
  { codigo: '02-40', descripcion: 'PLACA 6X6', cantidad: 0, marca: 'SWYMONS', modelo: '6X6', serie: '' },
  { codigo: '02-41', descripcion: 'PLACA 6X8', cantidad: 21, marca: 'SWYMONS', modelo: '6X8', serie: '' },
  { codigo: '02-112', descripcion: 'PLACA 8X4', cantidad: 12, marca: 'SWYMONS', modelo: '8X4', serie: '' },
  { codigo: '02-42', descripcion: 'PLACA 8X6', cantidad: 0, marca: 'SWYMONS', modelo: '8X6', serie: '' },
  { codigo: '02-43', descripcion: 'PLACA 8X8', cantidad: 24, marca: 'SWYMONS', modelo: '8X8', serie: '' },
  { codigo: '02-44', descripcion: 'PLACA 10X4', cantidad: 15, marca: 'SWYMONS', modelo: '10X4', serie: '' },
  { codigo: '02-84', descripcion: 'PLACA 10X6', cantidad: 16, marca: 'SWYMONS', modelo: '10X6', serie: '' },
  { codigo: '02-45', descripcion: 'PLACA 10X8', cantidad: 30, marca: 'SWYMONS', modelo: '10X8', serie: '' },
  { codigo: '02-46', descripcion: 'PLACA 12X4', cantidad: 5, marca: 'SWYMONS', modelo: '12X4', serie: '' },
  { codigo: '02-47', descripcion: 'PLACA 12X6', cantidad: 2, marca: 'SWYMONS', modelo: '12X6', serie: '' },
  { codigo: '02-48', descripcion: 'PLACA 12X8', cantidad: 146, marca: 'SWYMONS', modelo: '12x8', serie: '' },
  { codigo: '02-49', descripcion: 'PLACA 14X4', cantidad: 0, marca: 'SWYMONS', modelo: '14X4', serie: '' },
  { codigo: '02-50', descripcion: 'PLACA 14X6', cantidad: 1, marca: 'SWYMONS', modelo: '14X6', serie: '' },
  { codigo: '02-51', descripcion: 'PLACA 14X8', cantidad: 9, marca: 'SWYMONS', modelo: '14X8', serie: '' },
  { codigo: '02-111', descripcion: 'PLACA 16X4', cantidad: 0, marca: 'SWYMONS', modelo: '16X4', serie: '' },
  { codigo: '02-127', descripcion: 'PLACA 16X5', cantidad: 1, marca: 'SWYMONS', modelo: '16X5', serie: '' },
  { codigo: '02-52', descripcion: 'PLACA 16X6', cantidad: 3, marca: 'SWYMONS', modelo: '16X6', serie: '' },
  { codigo: '02-53', descripcion: 'PLACA 16X8', cantidad: 17, marca: 'SWYMONS', modelo: '16X8', serie: '' },
  { codigo: '02-54', descripcion: 'PLACA 18X4', cantidad: 0, marca: 'SWYMONS', modelo: '18X4', serie: '' },
  { codigo: '02-55', descripcion: 'PLACA 18X6', cantidad: 2, marca: 'SWYMONS', modelo: '18X6', serie: '' },
  { codigo: '02-56', descripcion: 'PLACA 18X8', cantidad: 23, marca: 'SWYMONS', modelo: '18X8', serie: '' },
  { codigo: '02-57', descripcion: 'PLACA 20X4', cantidad: 0, marca: 'SWYMONS', modelo: '20X4', serie: '' },
  { codigo: '02-58', descripcion: 'PLACA 20X6', cantidad: 4, marca: 'SWYMONS', modelo: '20X6', serie: '' },
  { codigo: '02-59', descripcion: 'PLACA 20X8', cantidad: 26, marca: 'SWYMONS', modelo: '20X8', serie: '' },
  { codigo: '02-60', descripcion: 'PLACA 22X4', cantidad: 1, marca: 'SWYMONS', modelo: '22X4', serie: '' },
  { codigo: '02-114', descripcion: 'PLACA 22X6', cantidad: 0, marca: 'SWYMONS', modelo: '22X6', serie: '' },
  { codigo: '02-61', descripcion: 'PLACA 22X8', cantidad: 17, marca: 'SWYMONS', modelo: '22X8', serie: '' },
  { codigo: '02-62', descripcion: 'PLACA 24X4', cantidad: 75, marca: 'SWYMONS', modelo: '24X4', serie: '' },
  { codigo: '02-113', descripcion: 'PLACA 24X5', cantidad: 0, marca: 'SWYMONS', modelo: '24X5', serie: '' },
  { codigo: '02-63', descripcion: 'PLACA 24X6', cantidad: 41, marca: 'SWYMONS', modelo: '24X6', serie: '' },
  { codigo: '02-64', descripcion: 'PLACA 24X8', cantidad: 858, marca: 'SWYMONS', modelo: '24X8', serie: '' },
  { codigo: '02-66', descripcion: 'ESQUINERO 6X6X8', cantidad: 23, marca: 'SWYMONS', modelo: '6X6X8', serie: '' },
  { codigo: '02-67', descripcion: 'ALINEADORES DE PLACAS', cantidad: 1347, marca: 'SWYMONS', modelo: 'STANDAR', serie: '' },
  { codigo: '02-68', descripcion: 'CUÑAS STANDAR', cantidad: 10187, marca: 'SWYMONS', modelo: 'STANDAR', serie: '' },
  { codigo: '02-69', descripcion: 'CUÑAS ESPECIALES', cantidad: 751, marca: 'SWYMONS', modelo: 'ESPECIAL', serie: '' },
  { codigo: '02-70', descripcion: 'BARUL CONVENCIONAL GRANDE NARANJA', cantidad: 396, marca: 'SWYMONS', modelo: '2MTS A 4MTS', serie: '2-4 MTS' },
  { codigo: '02-71', descripcion: 'BARUL CONVENCIONAL PEQUEÑO ROJO', cantidad: 0, marca: 'SWYMONS', modelo: '1.5MTS A 2MTS', serie: '1.5-2 MTS' },
  { codigo: '02-72', descripcion: 'FLOTA CANAL', cantidad: 1, marca: 'SWYMONS', modelo: '1.90MTS', serie: '' },
  { codigo: '02-73', descripcion: 'FLOTA CANAL', cantidad: 1, marca: 'SWYMONS', modelo: '1.50MTS', serie: '' },
  { codigo: '02-74', descripcion: 'FLOTA CANAL', cantidad: 1, marca: 'SWYMONS', modelo: '0.90MTS', serie: '' },
  { codigo: '02-75', descripcion: 'TENSORES DE PLACAS', cantidad: 50, marca: 'SWYMONS', modelo: '0.50CM', serie: '' },
  { codigo: '02-76', descripcion: 'EXTENCION PARA FLOTA', cantidad: 5, marca: 'SWYMONS', modelo: '1.80 MTS', serie: '' },
  { codigo: '02-77', descripcion: 'ESQUINERO 2X2X8', cantidad: 23, marca: 'SWYMONS', modelo: '2X2X8', serie: '2X2X8' },
  { codigo: '02-103', descripcion: 'AJUSTE 1X2X4 (FILLER)', cantidad: 8, marca: 'SWYMONS', modelo: '1X2X4', serie: '1X2X4' },
  { codigo: '02-78', descripcion: 'AJUSTE 1X2X8 (FILLER)', cantidad: 13, marca: 'SWYMONS', modelo: '1X2X8', serie: '1X2X8' },
  { codigo: '02-79', descripcion: 'AJUSTE 2X2X8 (FILLER)', cantidad: 3, marca: 'SWYMONS', modelo: '2X2X8', serie: '2X2X8' },
  { codigo: '02-80', descripcion: 'ESQUINERO 2X2X3', cantidad: 9, marca: 'SWYMONS', modelo: '2x2x3', serie: '2X2X3' },
  { codigo: '02-81', descripcion: 'BARUL GALVANIZADO CONVENCIONAL', cantidad: 224, marca: 'SWYMONS', modelo: 'GALVANIZADO', serie: '2-4 MTS' },
  { codigo: '02-82', descripcion: 'PLATO PARA ALLANADORA', cantidad: 3, marca: 'N/D', modelo: '36"', serie: '' },
  { codigo: '02-89', descripcion: 'ESCALERA 8 PIES PLEGABLE DE ALUMINIO', cantidad: 1, marca: 'CUPRUM', modelo: 'PLEGABLE', serie: '8 PIES' },
  { codigo: '02-91', descripcion: 'ESCALERA 6 PIES PLEGABLE DE ALUMINIO', cantidad: 1, marca: 'INCO', modelo: 'PLEGABLE', serie: '6 PIES' },
  { codigo: '02-93', descripcion: 'ESCALERA 10 PIES PLEGABLE DE FIBRA', cantidad: 1, marca: 'LOUSVILLE', modelo: 'PLEGABLE', serie: '10 PIES' },
  { codigo: '02-94', descripcion: 'CORTADORA HUSQVARNA', cantidad: 1, marca: 'HUSQVARNA', modelo: 'FS400', serie: 'H1U2023231001088' },
  { codigo: '02-95', descripcion: 'CORTADORA HUSQVARNA', cantidad: 1, marca: 'HUSQVARNA', modelo: 'FS400', serie: 'H1U2023231000760' },
  { codigo: '02-98', descripcion: 'VIBRADOR ELECTRICO SIMAQ VERDE', cantidad: 1, marca: 'SIMAQ', modelo: 'CIRCULAR', serie: 'VERDE' },
  { codigo: '02-100', descripcion: 'VIBRADOR ELECTRICO ENAR', cantidad: 1, marca: 'ENAR', modelo: 'DINGO', serie: '' },
  { codigo: '02-101', descripcion: 'VIBRADOR ELECTRICO ENAR', cantidad: 1, marca: 'ENAR', modelo: 'DINGO', serie: '' },
  { codigo: '02-102', descripcion: 'CODAL ALUMINIO DE 3.00 MTS', cantidad: 2, marca: 'N/D', modelo: '3.20 MTS', serie: '' },
  { codigo: '02-105', descripcion: 'ESQUINERO 2X2X4', cantidad: 0, marca: 'N/D', modelo: '2X2X4', serie: '' },
  { codigo: '02-107', descripcion: 'ESQUINERO  6X6X6', cantidad: 13, marca: 'SWYMONS', modelo: '6X6X6', serie: '' },
  { codigo: '02-108', descripcion: 'BATEA PARA CONCRETO', cantidad: 1, marca: 'N/D', modelo: '1.50X1.50', serie: '' },
  { codigo: '02-109', descripcion: 'PLACA METALICA DE 12X5', cantidad: 79, marca: 'SWYMONS', modelo: '12X5', serie: 'METALICA' },
  { codigo: '02-116', descripcion: 'ALLANADORA ENAR TIFON 36"', cantidad: 1, marca: 'ENAR', modelo: 'TIFON 900H/36"', serie: 'HONDA GX160' },
  { codigo: '02-118', descripcion: 'VIBRADOR ELECTRICO ENAR', cantidad: 1, marca: 'ENAR', modelo: 'DINGO', serie: '24651211' },
  { codigo: '02-119', descripcion: 'VIBRADOR ELECTRICO ENAR', cantidad: 1, marca: 'ENAR', modelo: 'DINGO', serie: '24651212' },
  { codigo: '02-120', descripcion: 'ESCALERA EXTENSIBLE DE ALUMINIO 10 PIES', cantidad: 1, marca: 'N/D', modelo: 'ALUMINIO', serie: 'EXTENSIBLE' },
  { codigo: '02-122', descripcion: 'MESCLADORA 2 SACO JOPER', cantidad: 1, marca: 'JOPER', modelo: 'R200STLX', serie: 'B59890' },
  { codigo: '02-123', descripcion: 'MESCLADORA 2 SACOS JOPER', cantidad: 1, marca: 'JOPER', modelo: 'R200STLX', serie: 'B59899' },
  { codigo: '02-124', descripcion: 'CORTADORA  HUSQVARNA.', cantidad: 1, marca: 'HUSQVARNA', modelo: 'FS-400-LV', serie: '2024361000538' },
  { codigo: '02-125', descripcion: 'BARUL DE CARGA GALVANIZADO BAZUKA.', cantidad: 190, marca: 'SWYMONS', modelo: 'BAZUKA', serie: '2-4 MTS' },
  { codigo: '02-126', descripcion: 'CORTADORA HUSQVARNA', cantidad: 1, marca: 'HUSQVARNA', modelo: 'FS-400LV', serie: '2025024000058' },
  { codigo: '02-128', descripcion: 'ESCALERA PLEGABLE DE 8 PIES ALUMINIO', cantidad: 1, marca: 'N/D', modelo: '8 PIES', serie: '8 PIES' },
  { codigo: '02-129', descripcion: 'BRIGITTE', cantidad: 2, marca: 'N/D', modelo: '2', serie: '' },
  { codigo: '02-130', descripcion: 'MESCLADORA 1 SACO CIPSA POLIETILENO GX270', cantidad: 1, marca: 'CIPSA', modelo: 'ULTRAPMP9A', serie: 'UP2509006' },
  { codigo: '02-133', descripcion: 'BARUL GALVANIZADO DE 1.05X1.80 PEQUEÑO', cantidad: 197, marca: 'SWYMONS', modelo: '1.05X1.80', serie: '1.05X1.80' },
  { codigo: '02-148', descripcion: 'BARUL NARANJA PEQUEÑO 1.05X1.80', cantidad: 20, marca: 'BMC', modelo: '1.05X1.80', serie: '1.05X1.80' },
  { codigo: '02-135', descripcion: 'MESCLADORA DE 2 SACOS CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'MAXI 20', serie: 'MDSM2508025' },
  { codigo: '02-136', descripcion: 'MESCLADORA DE 1 SACO CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'ULTRAMP9A', serie: 'UM2508229' },
  { codigo: '02-140', descripcion: 'CORTADORA ELECTRICA HUSQVARNA K4000', cantidad: 1, marca: 'HUSQVARNA', modelo: 'K4000', serie: '20245013029' },
  { codigo: '02-141', descripcion: 'ESCALERA PLEGABLE 12 PIES', cantidad: 1, marca: 'STRONGWELL', modelo: 'PLEGABLE', serie: 'DE TIJERA' },
  { codigo: '02-144', descripcion: 'PLATO BASE ANDAMIOS DE CARGA', cantidad: 21, marca: 'SWYMONS', modelo: '8X8', serie: '100' },
  { codigo: '02-145', descripcion: 'CABEZAL EN U (CANASTA)', cantidad: 8, marca: 'SWYMONS', modelo: '12X12', serie: '200' },
  { codigo: '02-146', descripcion: 'BARUL GALVANIZADO LARGO', cantidad: 39, marca: 'SWYMONS', modelo: '3-5MTS', serie: '3-5MTS' },
  { codigo: '02-147', descripcion: 'ALLANADORA ENAR TIFON 36"', cantidad: 1, marca: 'ENAR', modelo: 'TIFON 900H/36"', serie: 'GCBCH1485515' },
  { codigo: '02-149', descripcion: 'REGLETA VIBRATORIA WEBER', cantidad: 1, marca: 'WEBER', modelo: 'VS', serie: '13789' },
  { codigo: '02-150', descripcion: 'VIBRADOR DE COMBUSTION CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'MVR6', serie: 'T1567445' },
  { codigo: '02-151', descripcion: 'VIBRADOR DE COMBUSTION CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'MVR6', serie: 'T2150978' },
  { codigo: '02-152', descripcion: 'VIBRADOR DE COMBUSTION CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'MVR6', serie: 'T1987527' },
  { codigo: '02-153', descripcion: 'MESCLADORA 2 SACOS CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'M20SMHJL13A', serie: 'MDSM2512004' },
  { codigo: '02-154', descripcion: 'MESCLADORA 2 SACOS CIPSA', cantidad: 1, marca: 'CIPSA', modelo: 'M20SMHJL13A', serie: 'MDSM2512003' },
  { codigo: '02-155', descripcion: 'ASPAS DE ALLANADORA, JUEGO DE 4 PIEZAS.', cantidad: 0, marca: 'N/D', modelo: '4 UNDS', serie: '8"X14"' },
  { codigo: '03-03', descripcion: 'SOLDADOR 10,000 LINCOLN ELECTRIC', cantidad: 1, marca: 'LINCOLN ELECTRIC', modelo: '10,000 PLUS EAGLE', serie: '' },
  { codigo: '03-04', descripcion: 'SOLDADOR 10,000 LINCOLN ELECTRIC', cantidad: 1, marca: 'LINCOLN ELECTRIC', modelo: '10,000 PLUS EAGLE', serie: '' },
  { codigo: '03-12', descripcion: 'TORRE DE ILUMINACION CIPSA AMARILLA 1', cantidad: 1, marca: 'CIPSA', modelo: 'CTIC6000', serie: '' },
  { codigo: '03-13', descripcion: 'TORRE DE ILUMINACION CIPSA GRIS', cantidad: 1, marca: 'CIPSA', modelo: 'CTIC6000', serie: '' },
  { codigo: '03-14', descripcion: 'TORRE DE ILUMINACION DOOSAN', cantidad: 1, marca: 'DOOSAN', modelo: 'SCWKUB-60HZ-T4F', serie: '477923UHAAG08' },
  { codigo: '03-15', descripcion: 'GENERADOR 3,300 TRUPER (NARANJA)', cantidad: 1, marca: 'TRUPER', modelo: 'GP3300', serie: '' },
  { codigo: '03-17', descripcion: 'GENERADOR 200A SOLDADOR MPOWER', cantidad: 1, marca: 'MPOWER', modelo: 'AXQ1-200A', serie: 'AZUL' },
  { codigo: '03-19', descripcion: 'GENERADOR SOLDADOR 190 HOGONG', cantidad: 1, marca: 'HOGONG', modelo: 'EDGE190DIESEL', serie: 'JB/T9528-1999' },
  { codigo: '03-20', descripcion: 'GENERADOR 200K FORCE', cantidad: 1, marca: 'FORCE', modelo: 'FP8200K', serie: '' },
  { codigo: '03-21', descripcion: 'GENERADOR 7,000K FORCE', cantidad: 1, marca: 'FORCE', modelo: 'FP7000K', serie: '' },
  { codigo: '03-22', descripcion: 'GENERADOR 7,000W TRUPER NARANJA', cantidad: 1, marca: 'TRUPER', modelo: '7,000W', serie: '' },
  { codigo: '03-23', descripcion: 'GENERADOR HOBART 11,000 (RANGER)', cantidad: 1, marca: 'HOBART', modelo: 'ELITE 225', serie: 'NC510852R' },
  { codigo: '03-26', descripcion: 'TORRE DE ILUMINACION MPOWER GRIS', cantidad: 1, marca: 'MPOWER', modelo: 'MPTI4500', serie: 'MPTI0121000.1' },
  { codigo: '03-31', descripcion: 'TORRE DE ILUMINACION CIPSA AMARILLA 2', cantidad: 1, marca: 'CIPSA', modelo: 'CTIC6000', serie: 'CTIC602407017' },
  { codigo: '03-32', descripcion: 'GENERADOR SOLDADOR MPOWER', cantidad: 1, marca: 'MPOWER', modelo: 'AXQ1-200AMP', serie: 'MOTOR MPOWER' },
  { codigo: '03-33', descripcion: 'GENERADOR DEPCO 23KVH', cantidad: 1, marca: 'DEPCO', modelo: 'DPK-DP-26', serie: 'DPK202403509' },
  { codigo: '03-34', descripcion: 'GENERADOR MPOWER 3500 PEQUEÑO', cantidad: 1, marca: 'MPOWER', modelo: '3500', serie: 'AZUL' },
  { codigo: '03-35', descripcion: 'GENERADOR MPOWER 3500 PEQUEÑO', cantidad: 1, marca: 'MPOWER', modelo: '3500', serie: 'AZUL' },
  { codigo: '03-36', descripcion: 'GENERADOR MPOWER 3500 PEQUEÑO', cantidad: 1, marca: 'MPOWER', modelo: '3500', serie: 'AZUL' },
  { codigo: '03-37', descripcion: 'EXTENSION ELECTRICA CERTIFICADA 19 MTS.', cantidad: 1, marca: 'N/D', modelo: 'CERTIFICADA', serie: '19 METROS' },
  { codigo: '03-38', descripcion: 'EXTENSION ELECTRICA CERTIFICADA 10.5 MTS', cantidad: 1, marca: 'N/D', modelo: 'CERTIFICADA', serie: '10.5 METROS' },
  { codigo: '03-39', descripcion: 'GENERADOR SOLDADOE MPOWER', cantidad: 1, marca: 'MPOWER', modelo: 'AXQ1-200AMP', serie: '190FD-AXQ1-200A' },
  { codigo: '04-04', descripcion: 'BOMBAS TRAGA SOLIDO 3"MPOPWER', cantidad: 1, marca: 'MPOWER', modelo: '80WG', serie: '' },
  { codigo: '04-05', descripcion: 'HIDROLAVADORA 2700PSI POWER', cantidad: 1, marca: 'POWER', modelo: 'PWF2701SH', serie: '' },
  { codigo: '04-06', descripcion: 'HIDROESTATICA HELBERT', cantidad: 1, marca: 'HELBERT', modelo: 'HRHG 102', serie: '' },
  { codigo: '04-11', descripcion: 'HIDROLAVADORA  MPOPWER 3500PSI', cantidad: 1, marca: 'MPOWER', modelo: 'HL3500/3500PSI', serie: 'MOTOR MPOWER' },
  { codigo: '04-12', descripcion: 'BOMBAS TRAGA SOLIDO 3"', cantidad: 1, marca: 'KOHLER', modelo: 'TP30 3001/3"', serie: '5121430025' },
  { codigo: '04-13', descripcion: 'HIDROLAVADORA IPOWER2700', cantidad: 1, marca: 'IPOWER', modelo: 'IPOWER2700', serie: 'PWF2701SH' },
  { codigo: '04-14', descripcion: 'BOMBAS  DE AGUA DE  3" NUEVA', cantidad: 1, marca: 'EMPOWER', modelo: 'TP3.0', serie: '5121430495' },
  { codigo: '04-15', descripcion: 'BOMBA AGUA TRAGA SOLIDO 4"', cantidad: 1, marca: 'HONDA', modelo: 'WT40HX', serie: 'MOTOR GX390' },
  { codigo: '05-01', descripcion: 'CHICHARRA ELECTRICA DEWALT', cantidad: 1, marca: 'DEWALT', modelo: 'DW25980', serie: '027976' },
  { codigo: '05-02', descripcion: 'CHICHARRA ELECTRICA DEWALT', cantidad: 1, marca: 'DEWALT', modelo: 'DW25980', serie: '030943' },
  { codigo: '05-04', descripcion: 'MARTILLO DEMOLEDOR FORCE', cantidad: 1, marca: 'FORCE', modelo: '3065', serie: '' },
  { codigo: '05-05', descripcion: 'ROTOMARTILLO DEMOLEDOR MILWAKEE', cantidad: 1, marca: 'MILWAKEE', modelo: '5317-21', serie: '' },
  { codigo: '05-06', descripcion: 'ROTOMARTILLO DEMOLEDOR DEWALT', cantidad: 1, marca: 'DEWALT', modelo: 'DW25733', serie: '' },
  { codigo: '05-07', descripcion: 'MARTILLO DEMOLEDOR FORCE', cantidad: 1, marca: 'FORCE', modelo: '3065', serie: '' },
  { codigo: '05-09', descripcion: 'ROTOMARTILLO TALADRO HILTI', cantidad: 1, marca: 'HILTI', modelo: '74145', serie: '347192' },
  { codigo: '05-10', descripcion: 'MARTILLO DEMOLEDOR FORCE', cantidad: 1, marca: 'FORCE', modelo: '3065', serie: '' },
  { codigo: '05-11', descripcion: 'COMPRESOR SULLAIR', cantidad: 1, marca: 'SULLAIR', modelo: '185KDPQCATT3', serie: '1000-3758' },
  { codigo: '05-12', descripcion: 'COMPRESOR SULLAIR', cantidad: 1, marca: 'SULLAIR', modelo: '185KDPQCATT3', serie: '1000-3756' },
  { codigo: '05-17', descripcion: 'CHICHARRA HIDRAULICA HYCON', cantidad: 1, marca: 'FORCE', modelo: 'HH20', serie: 'ACEITE' },
  { codigo: '05-18', descripcion: 'CHICHARRA NEUMATICA', cantidad: 1, marca: 'FORCE', modelo: 'SPB-30', serie: '' },
  { codigo: '05-21', descripcion: 'BROCA DE 2"', cantidad: 1, marca: 'HOTECHE', modelo: '2"', serie: '' },
  { codigo: '05-22', descripcion: 'BROCA DE 3"', cantidad: 1, marca: 'HOTECHE', modelo: '3"', serie: '' },
  { codigo: '05-23', descripcion: 'BROCA DE 4"', cantidad: 1, marca: 'HOTECHE', modelo: '4"', serie: '' },
  { codigo: '05-24', descripcion: 'BROCA DE 5"', cantidad: 1, marca: 'HOTECHE', modelo: '5"', serie: '' },
  { codigo: '05-25', descripcion: 'BROCA DE 6"', cantidad: 1, marca: 'HOTECHE', modelo: '6"', serie: '' },
  { codigo: '05-27', descripcion: 'COMPRESOR ATLAS COPCO (CHICAGO)', cantidad: 1, marca: 'ATLAS COPCO', modelo: 'CPS0.5', serie: 'APP465458' },
  { codigo: '05-30', descripcion: 'COMPRESOR PARA PINTAR TRUPER', cantidad: 1, marca: 'TRUPER', modelo: 'COMP-50LT', serie: 'NUEVO' },
  { codigo: '05-31', descripcion: 'CHICHARRA NEUMATICA', cantidad: 1, marca: 'CHICAGO', modelo: 'NEUMATIC', serie: 'DEMOLICION' },
  { codigo: '05-32', descripcion: 'TALADRO SACA NUCLEOS', cantidad: 1, marca: 'FERTON', modelo: '3036', serie: '' },
  { codigo: '05-33', descripcion: 'CHICHARRA ELECTRICA STANLEY/DEWALT', cantidad: 1, marca: 'STANLEY', modelo: 'D25980', serie: 'STANLEY/DEWALT' },
  { codigo: '05-34', descripcion: 'MARTILLO DEMOLEDOR FORCE', cantidad: 1, marca: 'FORCE', modelo: '3065', serie: '' },
  { codigo: '05-35', descripcion: 'MARTILLO DEMOLEDOR FORCE', cantidad: 1, marca: 'FORCE', modelo: '3065', serie: '' },
  { codigo: '05-37', descripcion: 'CHICHARRA NEUMATICA', cantidad: 1, marca: 'FORCE', modelo: 'SPB-30', serie: '' },
  { codigo: '05-38', descripcion: 'CHICHARRA NEUMATICA', cantidad: 1, marca: 'SULLIVAN', modelo: 'SPB-30', serie: '' },
  { codigo: '05-40', descripcion: 'TALADRO SACA NUCLEOS', cantidad: 1, marca: 'MILWAKEE', modelo: '4096', serie: '733C100241475' },
  { codigo: '05-41', descripcion: 'MANGUERA NEUMATICA', cantidad: 14, marca: 'RTI/GOOYEAR', modelo: 'CAUCHO REFORZADO', serie: '' },
  { codigo: '05-43', descripcion: 'CHICHARRA NEUMATICA', cantidad: 1, marca: 'FORCE', modelo: '3065', serie: '' },
  { codigo: '05-45', descripcion: 'ROTOMARTILLO DEMOLEDOR DEWALT', cantidad: 1, marca: 'DEWALT', modelo: 'D25712', serie: '302631' },
  { codigo: '05-46', descripcion: 'CHICHARRA NEUMATICA', cantidad: 1, marca: 'N/D', modelo: 'SPB-30', serie: '' },
  { codigo: '05-47', descripcion: 'MARTILLO DEMOLEDOR FORCE', cantidad: 1, marca: 'FORCE', modelo: '3065', serie: '' },
  { codigo: '05-48', descripcion: 'CHICHARRA ELECTRICA DEWALT', cantidad: 1, marca: 'DEWALT', modelo: 'D25980', serie: '024803' },
  { codigo: '05-49', descripcion: 'ROTOMARTILLO TALADRO HILTI', cantidad: 1, marca: 'HILTI', modelo: 'TE-46', serie: '04-00011067' },
  { codigo: '05-50', descripcion: 'ROTOMARTILLO HILTI', cantidad: 1, marca: 'HILTI', modelo: 'HILTI', serie: 'ROJO' },
  { codigo: '05-51', descripcion: 'MARTILLO DEMOLEDOR FORCE PEQUEÑO', cantidad: 1, marca: 'VFORCE', modelo: '3015', serie: '4400BMP' },
  { codigo: '05-53', descripcion: 'PULIDORA MANUAL MAKITA GRANDE', cantidad: 1, marca: 'MAKITA', modelo: '001', serie: '10' },
  { codigo: '05-54', descripcion: 'CHICHARRA NEUMATICA SULLIVAN', cantidad: 1, marca: 'SULLIVAN', modelo: 'S1777', serie: '010936' },
  { codigo: '05-55', descripcion: 'CHICHARRA NEUMATICA SULLIVAN', cantidad: 1, marca: 'SULLIVAN', modelo: 'S1777', serie: '010934' },
  { codigo: '05-56', descripcion: 'CHICHARRA NEUMATICA SULLIVAN', cantidad: 1, marca: 'SULLIVAN', modelo: 'S1777', serie: '010937' },
  { codigo: '05-57', descripcion: 'CHICHARRA NEUMATICA FORCE', cantidad: 1, marca: 'FORCE', modelo: 'TPB90', serie: '92LBS' },
  { codigo: '05-58', descripcion: 'CHICHARRA ELECTRICA DEWALT', cantidad: 1, marca: 'DEWALT', modelo: 'D25980', serie: '033302' },
  { codigo: '05-59', descripcion: 'CHICHARRA ELECTRICA DEWALT', cantidad: 1, marca: 'DEWALT', modelo: 'D25980-B3', serie: '6488' },
  { codigo: '05-60', descripcion: 'BROCA DE CONCRETO 1-1/2"', cantidad: 1, marca: 'BMC', modelo: '1-1/2"', serie: 'CONCRETO' },
  { codigo: '05-62', descripcion: 'SACA NUCLEO HUSQVARNA', cantidad: 1, marca: 'HUSQVARNA', modelo: 'DMS-240', serie: '20253310079' },
  { codigo: '06-01', descripcion: 'ANDAMIO INDUSTTRIAL', cantidad: 20, marca: 'SWYMONS', modelo: '2MTS X 1.20MTS', serie: '' },
  { codigo: '06-02', descripcion: 'ANDAMIO GRANDE', cantidad: 4, marca: 'BMC', modelo: '2MTS X 2MTS', serie: '' },
  { codigo: '06-03', descripcion: 'ANDAMIO STANDAR', cantidad: 1173, marca: 'BMC', modelo: '1.50MTS X 1.70MTS', serie: '' },
  { codigo: '06-32', descripcion: 'ANDAMIO DE CARGA 3 PIES', cantidad: 18, marca: 'SWYMONS', modelo: '3X4', serie: '3X4' },
  { codigo: '06-33', descripcion: 'ANDAMIO DE CARGA 4 PIES', cantidad: 12, marca: 'SWYMONS', modelo: '4X4', serie: '4X4' },
  { codigo: '06-34', descripcion: 'ANDAMIO DE CARGA 5 PIES', cantidad: 12, marca: 'SWYMONS', modelo: '5X4', serie: '5X4' },
  { codigo: '06-40', descripcion: 'ANDAMIO DE CARGA 6 PIES', cantidad: 68, marca: 'SWYMONS', modelo: '6X4', serie: '6X4' },
  { codigo: '06-05', descripcion: 'PLATAFORMA STANDAR', cantidad: 192, marca: 'BMC', modelo: '1.50 MTS LARGO', serie: '16"ANCHO' },
  { codigo: '06-07', descripcion: 'RODOS DE ANDAMIOS', cantidad: 110, marca: 'RTI', modelo: 'STANDAR', serie: '' },
  { codigo: '06-08', descripcion: 'ESCALERAS DE ANDAMIOS', cantidad: 19, marca: 'SWYMONS', modelo: 'STANDAR', serie: '' },
  { codigo: '06-09', descripcion: 'NIVELADORES DE ANDAMIO DE 1-1/4"', cantidad: 50, marca: 'SWYMONS', modelo: 'STANDAR', serie: '' },
  { codigo: '06-10', descripcion: 'ESCALERA EXTENSIBLE DE FIBRA 12X24 PIES', cantidad: 1, marca: 'STRONGWELL', modelo: 'PE-OR 90 ANGLE', serie: '49779 12\'A 24\'' },
  { codigo: '06-20', descripcion: 'NIVELADORES DE ANDAMIO DE CARGA DE 2"', cantidad: 26, marca: 'SWYMONS', modelo: 'DE CARGA', serie: '' },
  { codigo: '06-25', descripcion: 'ARNES DE SEGURIDAD', cantidad: 8, marca: 'BMC', modelo: '3-A', serie: '' },
  { codigo: '06-26', descripcion: 'ANDAMIO CERTIFICADO GALVANIZADO 1.27X1.90', cantidad: 102, marca: 'FORCE', modelo: 'CERTIFICADO', serie: 'GALVANIZADO' },
  { codigo: '06-28', descripcion: 'PLATAFORMA CERTIFICADA', cantidad: 14, marca: 'FORCE', modelo: 'CERTIFICADO', serie: 'GALVANIZADO' },
  { codigo: '06-29', descripcion: 'RODOS DE ANDAMIO CERTIFICADO', cantidad: 12, marca: 'VFORCE', modelo: 'VFORCE', serie: 'VFORCE' },
  { codigo: '06-31', descripcion: 'LINEAS DE VIDA RETRACTIL 300 LBS', cantidad: 3, marca: 'VFORCE', modelo: '300 LBS', serie: 'RETRACTIL' },
  { codigo: '06-35', descripcion: 'PLATO BASE DE ANDAMIOS DE CARGA', cantidad: 21, marca: 'SWYMONS', modelo: 'PLATO', serie: 'BASE' },
  { codigo: '06-42', descripcion: 'PRENSA PARA ANDAMIOS', cantidad: 10, marca: 'SWYMONS', modelo: '2X2', serie: '2X2' },
  { codigo: '07-47', descripcion: 'CONTENEDOR  OFICINA 20 PIES CLIMATIZADO.', cantidad: 1, marca: 'VFORCE', modelo: 'LUX OFICE', serie: '6MX3.1MX2.8M' },
  { codigo: '08-01', descripcion: 'BOBCAT MINI CARGADOR AMARILLO.', cantidad: 1, marca: 'CATERPILLAR', modelo: '236D3', serie: 'F9C01527' },
  { codigo: '08-02', descripcion: 'RETROEXCAVADORA BACKHOE MULLER', cantidad: 1, marca: 'MULLER', modelo: 'MR406', serie: 'RDV00400EN0501188' },
  { codigo: '08-03', descripcion: 'BOBCAT MINI CARGADOR BLANCO', cantidad: 1, marca: 'BOBCAT', modelo: 'S570', serie: 'B5N311233' },
  { codigo: '08-04', descripcion: 'RETROEXCAVADORABACKHOE JCB', cantidad: 1, marca: 'JCB', modelo: '3CX', serie: 'SD320/45064H00489540' },
  { codigo: '07-49', descripcion: 'CAMION H100 HYUNDAI BLANCO', cantidad: 1, marca: 'HYUNDAI', modelo: 'H100/403017', serie: 'D4BBR001488' },
  { codigo: '07-50', descripcion: 'CAMION INTERNACIONAL ROJO', cantidad: 1, marca: 'INTERNACIONAL', modelo: '4900-4X2/255090', serie: '468TM2U595917' },
  { codigo: '07-51', descripcion: 'CAMION FREIGHTLINER, BLANCO/NARANJA', cantidad: 1, marca: 'FREIGHTLINER', modelo: 'FL-70/376458', serie: '60242212' },
  { codigo: '07-52', descripcion: 'CAMION H100 HYUNDAI BLANCO', cantidad: 1, marca: 'HYUNDAI', modelo: 'H100/394532', serie: 'D4BBP015155' },
  { codigo: '07-53', descripcion: 'CAMION HYUNDAI MIGHTY', cantidad: 1, marca: 'HYUNDAI', modelo: 'CARGO/462344', serie: 'D4DCSD402929' },
  { codigo: '07-54', descripcion: 'CAMION INTERNACIONAL BLANCO', cantidad: 1, marca: 'INTERNACIONAL', modelo: '4300DT466/455748', serie: '466HM2U2012831' },
];


function getCategoryFromCodigo(codigo: string): string {
  const prefix = codigo.split('-')[0];
  const map: Record<string, string> = {
    '01': 'COMPACTACION',
    '02': 'CONCRETO Y FORMALETAS',
    '03': 'GENERADORES E ILUMINACION',
    '04': 'BOMBAS E HIDROLAVADORAS',
    '05': 'DEMOLICION Y PERFORACION',
    '06': 'ANDAMIOS Y SEGURIDAD',
    '07': 'VEHICULOS Y TRANSPORTE',
    '08': 'MAQUINARIA PESADA',
  };
  return map[prefix] || 'GENERAL';
}

async function main() {
  console.log('🌱 Iniciando semillado de base de datos...');

  // 1. Crear Empresa Demo
  const empresa = await prisma.empresa.upsert({
    where: { rfc: 'RME260723AAA' },
    update: {},
    create: {
      nombre: 'Rental Machinery Nicaragua S.A.',
      rfc: 'RME260723AAA',
      email: 'admin@rental.com.ni',
      telefono: '+505 2222-2222',
      direccion: 'Managua, Nicaragua',
    },
  });
  console.log(`🏢 Empresa creada: ${empresa.nombre} (${empresa.id})`);

  // 2. Crear Sucursal Demo
  const sucursal = await prisma.sucursal.upsert({
    where: { codigo: 'SUC-CENTRAL' },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: 'Sucursal Central Nicaragua',
      codigo: 'SUC-CENTRAL',
      direccion: 'Km 9.5 Carretera Masaya, Managua',
      telefono: '+505 8888-8888',
    },
  });
  console.log(`📍 Sucursal creada: ${sucursal.nombre} (${sucursal.id})`);

  // Limpiar roles antiguos que no sean ADMIN
  await prisma.rolPermiso.deleteMany({
    where: { rol: { nombre: { not: 'ADMIN' } } }
  });
  await prisma.usuarioRol.deleteMany({
    where: { rol: { nombre: { not: 'ADMIN' } } }
  });
  await prisma.rol.deleteMany({
    where: { nombre: { not: 'ADMIN' } }
  });
  console.log('🧹 Limpieza de roles de ejemplo completada.');

  // 3. Crear Roles
  const rolesADefinir = [
    { nombre: 'ADMIN', descripcion: 'Administrador del sistema con acceso total' },
  ];

  const rolesCreados = [];
  for (const item of rolesADefinir) {
    const rol = await prisma.rol.upsert({
      where: { nombre: item.nombre },
      update: { descripcion: item.descripcion },
      create: item,
    });
    rolesCreados.push(rol);
  }
  console.log(`🔐 Roles creados: ${rolesCreados.map((r) => r.nombre).join(', ')}`);

  // 4. Crear Permisos básicos
  const permisosADefinir = [
    { codigo: 'CLIENT.CREATE', descripcion: 'Crear nuevos clientes' },
    { codigo: 'CLIENT.UPDATE', descripcion: 'Editar clientes existentes' },
    { codigo: 'CLIENT.VIEW', descripcion: 'Ver catálogo de clientes' },
    { codigo: 'QUOTE.CREATE', descripcion: 'Crear cotizaciones' },
    { codigo: 'QUOTE.APPROVE', descripcion: 'Aprobar cotizaciones comercialmente' },
    { codigo: 'CONTRACT.CREATE', descripcion: 'Generar contratos de renta' },
    { codigo: 'INVENTORY.CREATE', descripcion: 'Dar de alta maquinaria' },
    { codigo: 'INVENTORY.VIEW', descripcion: 'Ver inventario y disponibilidad' },
    { codigo: 'DISPATCH.CREATE', descripcion: 'Registrar despachos de equipos' },
    { codigo: 'RETURN.CREATE', descripcion: 'Registrar devolución de equipos' },
    { codigo: 'REPORT.EXPORT', descripcion: 'Exportar reportes de negocio' },
  ];

  const permisosCreados = [];
  for (const item of permisosADefinir) {
    const permiso = await prisma.permiso.upsert({
      where: { codigo: item.codigo },
      update: { descripcion: item.descripcion },
      create: item,
    });
    permisosCreados.push(permiso);
  }
  console.log(`🛠️ Permisos básicos creados`);

  // 5. Vincular todos los permisos al rol ADMIN
  const adminRol = rolesCreados.find((r) => r.nombre === 'ADMIN');
  if (adminRol) {
    for (const permiso of permisosCreados) {
      await prisma.rolPermiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: adminRol.id,
            permisoId: permiso.id,
          },
        },
        update: {},
        create: {
          rolId: adminRol.id,
          permisoId: permiso.id,
        },
      });
    }
    console.log(`🔗 Permisos vinculados al rol ADMIN`);
  }

  // 6. Crear Usuario Administrador por Defecto
  const adminEmail = 'admin@rental.com';
  const adminPasswordHash = await argon2.hash('admin123'); // Contraseña por defecto

  const adminUser = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      empresaId: empresa.id,
      sucursalId: sucursal.id,
      email: adminEmail,
      password: adminPasswordHash,
      nombre: 'Administrador',
      apellido: 'Principal',
      activo: true,
      roles: {
        create: {
          rolId: adminRol!.id,
        },
      },
    },
  });
  console.log(`👤 Usuario Administrador creado: ${adminUser.email} (Contraseña: admin123)`);

  // 7. Limpiar e importar el inventario BM Construcciones
  console.log('🧹 Limpiando equipos e inventario previo...');
  await prisma.equipo.deleteMany();

  const categoriaCache = new Map<string, string>();
  const marcaCache = new Map<string, string>();
  const seriesUsadas = new Set<string>();

  // Precargar categorías y marcas existentes para evitar Unique Constraint error
  const [existingCats, existingBrands] = await Promise.all([
    prisma.categoria.findMany(),
    prisma.marca.findMany(),
  ]);
  existingCats.forEach(c => categoriaCache.set(c.nombre, c.id));
  existingBrands.forEach(m => marcaCache.set(m.nombre, m.id));

  let total = 0;
  let errores = 0;

  for (const item of inventario) {
    const catNombre = getCategoryFromCodigo(item.codigo);
    if (!categoriaCache.has(catNombre)) {
      const c = await prisma.categoria.create({ data: { nombre: catNombre } });
      categoriaCache.set(catNombre, c.id);
    }
    const categoriaId = categoriaCache.get(catNombre)!;

    const marcaNombre = (item.marca || 'N/D').toUpperCase().trim();
    if (!marcaCache.has(marcaNombre)) {
      const m = await prisma.marca.create({ data: { nombre: marcaNombre } });
      marcaCache.set(marcaNombre, m.id);
    }
    const marcaId = marcaCache.get(marcaNombre)!;

    let numeroSerie = item.serie.trim() || null;
    if (numeroSerie) {
      if (seriesUsadas.has(numeroSerie.toUpperCase())) {
        let suffix = 2;
        let newSerie = `${numeroSerie}-${suffix}`;
        while (seriesUsadas.has(newSerie.toUpperCase())) {
          suffix++;
          newSerie = `${numeroSerie}-${suffix}`;
        }
        numeroSerie = newSerie;
      }
      seriesUsadas.add(numeroSerie.toUpperCase());
    }

    try {
      await prisma.equipo.create({
        data: {
          codigo: item.codigo,
          modelo: item.modelo || 'S/M',
          numeroSerie,
          precioRentaDia: 0,
          horometro: 0,
          descripcion: item.descripcion.trim(),
          cantidadTotal: item.cantidad,
          cantidadDisponible: item.cantidad,
          estado: 'DISPONIBLE',
          empresaId: empresa.id,
          sucursalId: sucursal.id,
          categoriaId,
          marcaId,
        }
      });
      total++;
    } catch (err: any) {
      console.error(`Error [${item.codigo}] ${item.descripcion}:`, err.message);
      errores++;
    }
  }

  console.log(`\n✅ Inventario cargado con éxito: ${total} artículos, ${errores} errores.`);
  console.log('✅ Semillado finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el semillado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
