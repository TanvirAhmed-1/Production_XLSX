import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('Birichina- Month of October Sign off Production Plan- 26th October.xlsx');
console.log('Reading file:', filePath);

const workbook = XLSX.readFile(filePath);
console.log('Sheet names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n================================`);
  console.log(`Sheet: ${sheetName}`);
  console.log(`================================`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total rows: ${data.length}`);
  
  for (let i = 0; i < Math.min(25, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(row.slice(0, 30)));
    }
  }
}
