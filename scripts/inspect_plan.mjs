import XLSX from 'xlsx';
import path from 'path';
const sheet = XLSX.readFile(path.resolve('Birichina- Month of October Sign off Production Plan- 26th October.xlsx')).Sheets['Birichina'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
data.forEach((r, i) => { 
    if (r[33] === 'Plan/Day') { 
        console.log(`Row ${i}: Line=${r[0]} Unit=${r[2]} Type=${r[33]}`); 
        console.log(`Row ${i+1}: Type=${data[i+1]?.[33]}`); 
        console.log(`Row ${i+2}: Type=${data[i+2]?.[33]}`); 
        console.log(`Row ${i+3}: Type=${data[i+3]?.[33]}`); 
    } 
});
