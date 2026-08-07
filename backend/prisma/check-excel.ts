import * as xlsx from 'xlsx';

const filePath = 'C:\\Users\\abdia\\Downloads\\CLIENTES BM.xlsx';
try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json<any>(sheet);
  if (data.length > 0) {
    console.log("Column names:", Object.keys(data[0]));
    console.log("First row data:", data[0]);
  } else {
    console.log("Excel file is empty.");
  }
} catch (error) {
  console.error("Error reading Excel:", error);
}
