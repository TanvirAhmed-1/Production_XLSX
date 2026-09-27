/**
 * Deep audit of the Birichina Excel file.
 * Goal: Understand EVERY column, row, and data pattern so we can build a 100% accurate importer.
 */
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const FILE = 'g:/Sumon mama/report_project/my-app/Birichina- Month of October Sign off Production Plan- 26th October.xlsx';
const wb = xlsx.readFile(FILE);

console.log('=== SHEET NAMES ===');
console.log(wb.SheetNames);

// Focus on the main "Birichina" sheet which has all production data
const ws = wb.Sheets['Birichina'];
const allRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

console.log(`\n=== TOTAL ROWS: ${allRows.length} ===`);

// Find the header row - look for a row containing "Line" and "Buyer" and "Style"
let headerRowIdx = -1;
for (let i = 0; i < Math.min(20, allRows.length); i++) {
  const row = allRows[i];
  if (!row) continue;
  const rowStr = row.map(c => String(c || '')).join('|');
  console.log(`Row ${i}: [${row.length} cols] ${rowStr.substring(0, 300)}`);
  
  // Check for header keywords
  const hasLine = row.some(c => String(c || '').toLowerCase().includes('line'));
  const hasBuyer = row.some(c => String(c || '').toLowerCase().includes('buyer'));
  if (hasLine && hasBuyer && headerRowIdx === -1) {
    headerRowIdx = i;
    console.log(`  >>> HEADER ROW DETECTED at index ${i}`);
  }
}

if (headerRowIdx === -1) {
  console.log('ERROR: Could not find header row!');
  process.exit(1);
}

const headers = allRows[headerRowIdx];
console.log(`\n=== HEADER ROW (index ${headerRowIdx}) - ${headers.length} columns ===`);
headers.forEach((h, i) => {
  if (h !== null && h !== undefined && String(h).trim() !== '') {
    console.log(`  Col ${i} (${xlsx.utils.encode_col(i)}): "${h}"`);
  }
});

// Identify column groups
console.log('\n=== COLUMN CLASSIFICATION ===');
const metaCols = [];
const dateCols = [];

headers.forEach((h, i) => {
  if (h === null || h === undefined) return;
  const val = String(h).trim();
  
  // Check if it's a date (serial number or date string)
  if (typeof h === 'number' && h > 40000 && h < 50000) {
    // Excel date serial
    const d = xlsx.SSF.parse_date_code(h);
    const dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    dateCols.push({ idx: i, serial: h, dateStr, header: h });
    return;
  }
  
  // Check if it's a date string like "1-Oct" or "Oct 1"
  if (/^\d{1,2}[-\/]\w{3}/.test(val) || /\w{3}[-\/]\d{1,2}/.test(val)) {
    dateCols.push({ idx: i, header: val, dateStr: val });
    return;
  }
  
  metaCols.push({ idx: i, header: val });
});

console.log(`\nMeta columns (${metaCols.length}):`);
metaCols.forEach(c => console.log(`  Col ${c.idx}: "${c.header}"`));

console.log(`\nDate columns (${dateCols.length}):`);
dateCols.forEach(c => console.log(`  Col ${c.idx}: ${c.dateStr} (raw: ${c.header})`));

// Now analyze the data rows
console.log('\n=== DATA ANALYSIS ===');
const dataRows = allRows.slice(headerRowIdx + 1);
console.log(`Data rows (after header): ${dataRows.length}`);

// Count non-empty rows
let nonEmptyRows = 0;
let rowsWithLine = 0;
let rowsWithBuyer = 0;
let rowsWithStyle = 0;

// Find column indices for key fields
function findCol(keyword) {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] && String(headers[i]).toLowerCase().includes(keyword.toLowerCase())) {
      return i;
    }
  }
  return -1;
}

const colMap = {
  unit: findCol('Unit'),
  line: findCol('Line'),
  buyer: findCol('Buyer'),
  style: findCol('Style'),
  article: findCol('Article'),
  ocs: findCol('OCS'),
  subOc: findCol('Sub OC'),
  color: findCol('Color'),
  orderQty: findCol('Order Qty'),
  planQty: findCol('Plan Qty'),
  smv: findCol('SMV'),
  season: findCol('Season'),
  poNo: findCol('PO'),
  mainCategory: findCol('Main Category'),
  subCategory: findCol('Sub Category'),
  productType: findCol('Product Type'),
  orderStatus: findCol('Order Status'),
  ott: findCol('OTT'),
  pcd: findCol('PCD'),
  psd: findCol('PSD'),
  pfd: findCol('PFD'),
  exFactory: findCol('Ex-Factory'),
  fobPrice: findCol('FOB'),
  salesValue: findCol('Sales'),
  leadMerchant: findCol('Lead'),
  orderDept: findCol('Dept'),
  manpower: findCol('Man Power'),
  workingHour: findCol('Working Hour'),
};

console.log('\n=== COLUMN MAP ===');
Object.entries(colMap).forEach(([key, val]) => {
  console.log(`  ${key}: col ${val} ${val >= 0 ? `("${headers[val]}")` : '(NOT FOUND)'}`);
});

// Sample first 5 data rows
console.log('\n=== FIRST 5 DATA ROWS (key fields) ===');
const sampleKeys = ['unit', 'line', 'buyer', 'style', 'article', 'orderQty', 'planQty', 'smv', 'manpower'];
for (let i = 0; i < Math.min(5, dataRows.length); i++) {
  const row = dataRows[i];
  if (!row || row.every(c => c === null || c === undefined || c === '')) continue;
  const sample = {};
  sampleKeys.forEach(k => {
    if (colMap[k] >= 0) sample[k] = row[colMap[k]];
  });
  // Also show first date column value
  if (dateCols.length > 0) {
    sample['day1_target'] = row[dateCols[0].idx];
  }
  console.log(`  Row ${i}: ${JSON.stringify(sample)}`);
}

// Now check for sub-rows pattern
// In garments Excel, each "line" row may have TWO sub-rows: Target (Plan) and Actual
console.log('\n=== DETECTING TARGET/ACTUAL ROW PATTERN ===');
const targetActualCol = findCol('Target');
const targetActualCol2 = findCol('Actual');
console.log(`"Target" column: ${targetActualCol}, "Actual" column: ${targetActualCol2}`);

// Check if there's a column that says "Plan" or "Target" or "Actual"
// Typically in garments Excel, there's a hidden pattern
// Let's look at row pairs more carefully

// Check all column headers again more carefully
console.log('\n=== ALL COLUMN HEADERS (verbose) ===');
for (let i = 0; i < headers.length; i++) {
  const h = headers[i];
  const type = typeof h;
  if (h !== null && h !== undefined) {
    console.log(`  [${i}] type=${type} value="${h}"`);
  }
}

// Check for merged cells
const merges = ws['!merges'] || [];
console.log(`\n=== MERGED CELLS: ${merges.length} total ===`);
merges.slice(0, 30).forEach(m => {
  const s = xlsx.utils.encode_cell(m.s);
  const e = xlsx.utils.encode_cell(m.e);
  console.log(`  ${s}:${e}`);
});

// Count unique values in key columns
console.log('\n=== UNIQUE VALUES IN KEY COLUMNS ===');
const uniqueUnits = new Set();
const uniqueLines = new Set();
const uniqueBuyers = new Set();
const uniqueStyles = new Set();
const unitLineCounts = {};

dataRows.forEach(row => {
  if (!row) return;
  const unit = row[colMap.unit];
  const line = row[colMap.line];
  const buyer = row[colMap.buyer];
  const style = row[colMap.style];
  
  if (unit) uniqueUnits.add(String(unit).trim());
  if (line) {
    const lineStr = String(line).trim();
    uniqueLines.add(lineStr);
    const unitStr = unit ? String(unit).trim() : 'UNKNOWN';
    if (!unitLineCounts[unitStr]) unitLineCounts[unitStr] = new Set();
    unitLineCounts[unitStr].add(lineStr);
  }
  if (buyer) uniqueBuyers.add(String(buyer).trim());
  if (style) uniqueStyles.add(String(style).trim());
  if (unit || line || buyer) nonEmptyRows++;
  if (line) rowsWithLine++;
  if (buyer) rowsWithBuyer++;
  if (style) rowsWithStyle++;
});

console.log(`Non-empty data rows: ${nonEmptyRows}`);
console.log(`Rows with Line: ${rowsWithLine}`);
console.log(`Rows with Buyer: ${rowsWithBuyer}`);
console.log(`Rows with Style: ${rowsWithStyle}`);
console.log(`\nUnique Units (${uniqueUnits.size}): ${[...uniqueUnits].join(', ')}`);
console.log(`Unique Lines (${uniqueLines.size}): ${[...uniqueLines].slice(0, 20).join(', ')}...`);
console.log(`Unique Buyers (${uniqueBuyers.size}): ${[...uniqueBuyers].join(', ')}`);
console.log(`\nLines per Unit:`);
Object.entries(unitLineCounts).forEach(([unit, lines]) => {
  console.log(`  ${unit}: ${lines.size} lines -> ${[...lines].join(', ')}`);
});

// Check the actual day-column data patterns
console.log('\n=== DAY COLUMN DATA ANALYSIS ===');
// For each date column, count how many rows have data vs null
let dayStats = [];
dateCols.forEach(dc => {
  let withData = 0;
  let total = 0;
  let minVal = Infinity;
  let maxVal = -Infinity;
  let sum = 0;
  
  dataRows.forEach(row => {
    if (!row) return;
    const val = row[dc.idx];
    total++;
    if (val !== null && val !== undefined && val !== '' && val !== 0) {
      withData++;
      const numVal = Number(val);
      if (!isNaN(numVal)) {
        if (numVal < minVal) minVal = numVal;
        if (numVal > maxVal) maxVal = numVal;
        sum += numVal;
      }
    }
  });
  
  dayStats.push({
    date: dc.dateStr,
    col: dc.idx,
    withData,
    total,
    pctFilled: ((withData / total) * 100).toFixed(1) + '%',
    min: minVal === Infinity ? 0 : minVal,
    max: maxVal === -Infinity ? 0 : maxVal,
    sum: Math.round(sum)
  });
});

console.log('Date columns fill rates and ranges:');
dayStats.forEach(s => {
  console.log(`  ${s.date} (col ${s.col}): ${s.withData}/${s.total} filled (${s.pctFilled}), range [${s.min} - ${s.max}], sum=${s.sum}`);
});

// Check total plan target sum
let totalPlanSum = 0;
dateCols.forEach(dc => {
  dataRows.forEach(row => {
    if (!row) return;
    const val = Number(row[dc.idx]);
    if (!isNaN(val)) totalPlanSum += val;
  });
});
console.log(`\nTotal sum across all day columns: ${totalPlanSum.toLocaleString()}`);

// Check if there's a "Total" or "Plan Total" column
const totalCol = findCol('Total');
const planTotalCol = findCol('Plan Total');
console.log(`\n"Total" column: ${totalCol}, "Plan Total" column: ${planTotalCol}`);

if (totalCol >= 0) {
  let sumFromTotalCol = 0;
  dataRows.forEach(row => {
    if (!row) return;
    const val = Number(row[totalCol]);
    if (!isNaN(val)) sumFromTotalCol += val;
  });
  console.log(`Sum from Total column: ${sumFromTotalCol.toLocaleString()}`);
}

// CRITICAL: Check for the "actual" data pattern
// In many garments Excel files, actual data is in separate columns or separate rows
// Let's check if there's a second set of date columns for actuals
console.log('\n=== CHECKING FOR ACTUAL DATA COLUMNS ===');
// Look for columns after the date columns
const lastDateColIdx = dateCols.length > 0 ? dateCols[dateCols.length - 1].idx : 0;
console.log(`Last date column index: ${lastDateColIdx}`);
console.log('Columns after last date column:');
for (let i = lastDateColIdx + 1; i < headers.length; i++) {
  if (headers[i] !== null && headers[i] !== undefined) {
    console.log(`  [${i}] "${headers[i]}" (type: ${typeof headers[i]})`);
  }
}

// Also check the row just above the header for merged header info
if (headerRowIdx > 0) {
  console.log('\n=== ROW ABOVE HEADER (for merged header groups) ===');
  const aboveRow = allRows[headerRowIdx - 1];
  if (aboveRow) {
    aboveRow.forEach((val, i) => {
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        console.log(`  [${i}] "${val}"`);
      }
    });
  }
}

// Check for "Plan" / "Actual" indicators in a specific column
// Garments Excel often has rows grouped as: Line -> Plan row -> Actual row
console.log('\n=== ROW GROUPING PATTERN CHECK ===');
// Look at 20 consecutive rows around row 10-30 for pattern
for (let i = 0; i < Math.min(30, dataRows.length); i++) {
  const row = dataRows[i];
  if (!row) { console.log(`  DataRow ${i}: EMPTY`); continue; }
  
  const unit = row[colMap.unit] || '';
  const line = row[colMap.line] || '';
  const buyer = row[colMap.buyer] || '';
  const style = row[colMap.style] || '';
  const orderQty = row[colMap.orderQty] || '';
  const planQty = row[colMap.planQty] || '';
  const day1 = dateCols.length > 0 ? (row[dateCols[0].idx] || '') : '';
  
  console.log(`  DataRow ${i}: unit="${unit}" line="${line}" buyer="${buyer}" style="${String(style).substring(0,20)}" orderQty=${orderQty} planQty=${planQty} day1=${day1}`);
}

// Check other sheets for comparison
console.log('\n\n=== CHECKING OTHER SHEETS ===');
['U02', 'U03', 'U04', 'B2'].forEach(sheetName => {
  if (!wb.Sheets[sheetName]) {
    console.log(`Sheet "${sheetName}": NOT FOUND`);
    return;
  }
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  console.log(`\nSheet "${sheetName}": ${rows.length} rows`);
  // Show first 5 rows
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = rows[i];
    if (r && r.some(c => c !== null)) {
      console.log(`  Row ${i}: ${JSON.stringify(r).substring(0, 250)}`);
    }
  }
});

console.log('\n\n=== AUDIT COMPLETE ===');
