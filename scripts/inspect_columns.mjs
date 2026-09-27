import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('Birichina- Month of October Sign off Production Plan- 26th October.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Sheet names:', workbook.SheetNames);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

console.log('Row 0 length:', rows[0]?.length);
rows[0]?.forEach((col, idx) => {
  let dateFormatted = '';
  if (typeof col === 'number' && col > 40000 && col < 50000) {
    const d = XLSX.SSF.parse_date_code(col);
    dateFormatted = `-> Date: ${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  console.log(`Col ${idx}: ${col} ${dateFormatted}`);
});

console.log('\n--- Sample Data Row 1 ---');
rows[1]?.forEach((val, idx) => {
  console.log(`Col ${idx} [${rows[0][idx]}]: ${val}`);
});
