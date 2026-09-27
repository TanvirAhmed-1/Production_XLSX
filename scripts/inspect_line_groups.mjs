import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('Birichina- Month of October Sign off Production Plan- 26th October.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Birichina'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total rows in Birichina sheet:', rows.length);

for (let i = 0; i < Math.min(30, rows.length); i++) {
  const row = rows[i];
  console.log(`\nRow ${i}: Line=${row[0]}, Manpower=${row[1]}, Unit=${row[2]}, Buyer=${row[4]}, Style=${row[8]}, OrderQty=${row[17]}, SMV=${row[18]}, PlanQty=${row[34]}, Col33=${row[33]}`);
  if (!row[4] && row[33]) {
    // Summary row for line (e.g. Plan/Day, SAH, CLK Hour, Eff%)
    console.log(`  -> Special row: Col 32=${row[32]}, Col 33=${row[33]}, Col 34=${row[34]}, Daily=[${row.slice(35, 45).join(', ')}]`);
  }
}
