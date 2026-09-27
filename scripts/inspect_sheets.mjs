import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('Birichina- Month of October Sign off Production Plan- 26th October.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('All Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n========================================`);
  console.log(`Sheet: "${sheetName}" (Rows: ${data.length})`);
  console.log(`========================================`);
  
  // Find header rows (rows 0-10)
  for (let r = 0; r < Math.min(10, data.length); r++) {
    const row = data[r];
    if (row && row.some(cell => cell !== null && cell !== undefined)) {
      console.log(`Row ${r} (${row.length} cols):`, row.slice(0, 45));
    }
  }
}
