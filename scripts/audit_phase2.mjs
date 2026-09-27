/**
 * Phase 2 audit: Understand the exact row pattern - order items vs subtotal rows
 * and compare with what the current seed script does.
 */
import xlsx from 'xlsx';

const FILE = 'Birichina- Month of October Sign off Production Plan- 26th October.xlsx';
const wb = xlsx.readFile(FILE);
const ws = wb.Sheets['Birichina'];
const allRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });
const headers = allRows[0];
const dataRows = allRows.slice(1);

// Key columns from audit
const COL = {
  line: 0,       // "Line"
  manpower: 1,   // "Man-power"
  unit: 2,       // "Unit"
  orderStatus: 3,// "Order Status"
  buyer: 4,      // "Buyer"
  orderCode: 5,  // "Order Code"
  ocs: 6,        // "OCS"
  subOc: 7,      // "Sub-OC"
  styleRef: 8,   // "Style Ref."
  engage: 9,     // "Engage"
  orderDept: 10, // "Order Dept."
  leadMM: 11,    // "Lead - MM"
  merchant: 12,  // "Merchant."
  article: 13,   // "Article"
  season: 14,    // "SEASON"
  poNo: 15,      // "PO NO"
  color: 16,     // "Color"
  odrQty: 17,    // "ODR QTY"
  smv: 18,       // "SMV"
  mainCat: 19,   // "Main-Category"
  subCat: 20,    // "Sub-Category"
  type: 21,      // "Type"
  ott: 22,       // "OTT"
  revOtt: 23,    // "Revised -OTT"
  pcd: 24,       // "PCD"
  psd: 25,       // "PSD"
  pfd: 26,       // "PFD"
  exFac: 27,     // "EX-Fac"
  revDel: 28,    // "Revised Delivery"
  oCreated: 29,  // "O. Created Date"
  fob: 30,       // "Selling Price (FOB)"
  salesVal: 31,  // "Sales Value"
  workDays: 32,  // "Working Days"
  planDay: 33,   // "Plan/Day"
  planQty: 34,   // "Plan Qty"
  // Columns 35-65 are dates 2026-10-01 to 2026-10-31
};

const dateStartCol = 35;
const dateEndCol = 65;

// Analyze each row type
let orderItemCount = 0;
let subtotalRowCount = 0;
let metaRowCount = 0;
let emptyRowCount = 0;
const subtotalRows = [];
const orderItems = [];

// Critical pattern: 
// - Order item rows have: line, unit, buyer, orderCode, style all filled
// - Subtotal rows have: line filled, but NO buyer, NO orderCode - they have aggregated planQty + daily data
// - Meta rows might have: just a line name with efficiency/SAH calculations

dataRows.forEach((row, idx) => {
  if (!row || row.every(c => c === null || c === undefined || c === '')) {
    emptyRowCount++;
    return;
  }
  
  const line = row[COL.line] ? String(row[COL.line]).trim() : '';
  const unit = row[COL.unit] ? String(row[COL.unit]).trim() : '';
  const buyer = row[COL.buyer] ? String(row[COL.buyer]).trim() : '';
  const orderCode = row[COL.orderCode] ? String(row[COL.orderCode]).trim() : '';
  const style = row[COL.styleRef] ? String(row[COL.styleRef]).trim() : '';
  const planQty = row[COL.planQty];
  const day1 = row[dateStartCol];
  const odrQty = row[COL.odrQty];
  
  // Determine row type
  if (buyer && orderCode && style) {
    // This is a genuine order item row
    orderItemCount++;
    orderItems.push({
      idx: idx + 1,
      line, unit, buyer, style: style.substring(0, 25),
      orderCode: orderCode.substring(0, 40),
      odrQty: odrQty || '',
      planQty: planQty || '',
      day1: day1 || '',
      color: row[COL.color] || '',
      smv: row[COL.smv] || '',
    });
  } else if (line && planQty !== null && planQty !== undefined) {
    // This is a subtotal/summary row for a line
    subtotalRowCount++;
    subtotalRows.push({
      idx: idx + 1,
      line, unit, buyer, 
      planQty,
      day1: day1 || '',
      odrQty: odrQty || '',
      smv: row[COL.smv] || '',
      rowData: [row[COL.planQty], row[dateStartCol], row[dateStartCol+1], row[dateStartCol+2]]
    });
  } else {
    metaRowCount++;
  }
});

console.log('=== ROW TYPE BREAKDOWN ===');
console.log(`Order item rows: ${orderItemCount}`);
console.log(`Subtotal/summary rows: ${subtotalRowCount}`);
console.log(`Meta/other rows: ${metaRowCount}`);
console.log(`Empty rows: ${emptyRowCount}`);
console.log(`Total data rows: ${dataRows.length}`);

// Show the subtotal rows - these are the KEY
console.log('\n=== SUBTOTAL ROWS (first 30) ===');
subtotalRows.slice(0, 30).forEach(r => {
  console.log(`  Row ${r.idx}: line="${r.line}" unit="${r.unit}" buyer="${r.buyer}" planQty=${r.planQty} day1=${r.day1} odrQty=${r.odrQty} smv=${r.smv}`);
  console.log(`           data: [planQty=${r.rowData[0]}, d1=${r.rowData[1]}, d2=${r.rowData[2]}, d3=${r.rowData[3]}]`);
});

// Now check: for each line, how many order items and how many subtotal rows?
const lineGroups = {};
let currentLine = null;

dataRows.forEach((row, idx) => {
  if (!row) return;
  const line = row[COL.line] ? String(row[COL.line]).trim() : '';
  const buyer = row[COL.buyer] ? String(row[COL.buyer]).trim() : '';
  const orderCode = row[COL.orderCode] ? String(row[COL.orderCode]).trim() : '';
  const style = row[COL.styleRef] ? String(row[COL.styleRef]).trim() : '';
  
  if (line && line.match(/^[UB]\d/)) {
    currentLine = line;
  }
  
  if (!currentLine) return;
  if (!lineGroups[currentLine]) {
    lineGroups[currentLine] = { orderItems: 0, subtotalRows: 0, totalRows: 0 };
  }
  lineGroups[currentLine].totalRows++;
  
  if (buyer && orderCode && style) {
    lineGroups[currentLine].orderItems++;
  } else if (row[COL.planQty] !== null && row[COL.planQty] !== undefined) {
    lineGroups[currentLine].subtotalRows++;
  }
});

console.log('\n=== LINES BREAKDOWN (order items vs subtotal rows) ===');
const lineNames = Object.keys(lineGroups).sort();
lineNames.forEach(ln => {
  const g = lineGroups[ln];
  console.log(`  ${ln}: ${g.orderItems} orders, ${g.subtotalRows} subtotals, ${g.totalRows} total`);
});
console.log(`Total unique lines: ${lineNames.length}`);

// Check what columns 17-21 actually look like in order items vs subtotals
console.log('\n=== ORDER QTY COLUMN (col 17 = "ODR QTY") CHECK ===');
let hasOdrQty = 0;
let missingOdrQty = 0;
orderItems.forEach(item => {
  if (item.odrQty !== '' && item.odrQty !== null && item.odrQty !== undefined) {
    hasOdrQty++;
  } else {
    missingOdrQty++;
  }
});
console.log(`Order items with ODR QTY: ${hasOdrQty}`);
console.log(`Order items WITHOUT ODR QTY: ${missingOdrQty}`);

// Show some items with ODR QTY
console.log('\nSample order items WITH ODR QTY:');
orderItems.filter(i => i.odrQty).slice(0, 5).forEach(i => {
  console.log(`  Row ${i.idx}: ${i.line} ${i.buyer} odrQty=${i.odrQty} planQty=${i.planQty} smv=${i.smv}`);
});

console.log('\nSample order items WITHOUT ODR QTY:');
orderItems.filter(i => !i.odrQty).slice(0, 5).forEach(i => {
  console.log(`  Row ${i.idx}: ${i.line} ${i.buyer} odrQty="${i.odrQty}" planQty=${i.planQty} smv=${i.smv}`);
});

// Critical check: do order item rows have day-column data or only subtotal rows?
console.log('\n=== DAY COLUMN DATA: ORDER ITEMS vs SUBTOTALS ===');
let orderItemsWithDayData = 0;
let subtotalsWithDayData = 0;

orderItems.forEach(item => {
  if (item.day1 !== '' && item.day1 !== null && item.day1 !== undefined && item.day1 !== 0) {
    orderItemsWithDayData++;
  }
});

subtotalRows.forEach(sr => {
  if (sr.day1 !== '' && sr.day1 !== null && sr.day1 !== undefined && sr.day1 !== 0) {
    subtotalsWithDayData++;
  }
});

console.log(`Order items with day1 data: ${orderItemsWithDayData} / ${orderItems.length}`);
console.log(`Subtotal rows with day1 data: ${subtotalsWithDayData} / ${subtotalRows.length}`);

// This is CRITICAL - check subtotal row pattern for a single line (U02-01)
console.log('\n=== DETAILED SUBTOTAL PATTERN FOR U02-01 ===');
let u02_01_start = false;
let u02_01_count = 0;
dataRows.forEach((row, idx) => {
  if (!row) return;
  const line = row[COL.line] ? String(row[COL.line]).trim() : '';
  const buyer = row[COL.buyer] ? String(row[COL.buyer]).trim() : '';
  const orderCode = row[COL.orderCode] ? String(row[COL.orderCode]).trim() : '';
  
  if (line === 'U02-01') u02_01_start = true;
  if (line === 'U02-02') u02_01_start = false;
  
  if (u02_01_start && !buyer && !orderCode) {
    u02_01_count++;
    // Show ALL columns for this subtotal row
    console.log(`  Subtotal row ${u02_01_count} at dataRow ${idx}:`);
    console.log(`    line=${row[0]} manpower=${row[1]} unit=${row[2]}`);
    console.log(`    planQty=${row[34]} workDays=${row[32]} planDay=${row[33]}`);
    console.log(`    day values: ${Array.from({length: 5}, (_, i) => row[35+i]).join(', ')}...`);
    console.log(`    odrQty=${row[17]} smv=${row[18]}`);
    
    // Check what's in buyer/orderCode/style columns - might have "Plan Total" or "Target" labels
    console.log(`    col3=${row[3]} col4=${row[4]} col5=${row[5]} col6=${row[6]} col7=${row[7]} col8=${row[8]}`);
  }
});

// Now compare with existing seed script
console.log('\n=== COMPARING WITH CURRENT SEED SCRIPT ===');
// Read the existing seed script
import fs from 'fs';
const seedScript = fs.readFileSync('scripts/seed_from_excel.mjs', 'utf8');
console.log('Seed script length:', seedScript.length, 'bytes');

// Check key patterns in seed
const patterns = [
  'ODR QTY', 'Order Qty', 'orderQty', 'odrQty',
  'Plan Qty', 'planQty',
  'Man-power', 'manpower', 'Man Power',
  'Sub-OC', 'subOc',
  'Working Days', 'workingDays',
  'Plan/Day', 'planDay',
  'EX-Fac', 'exFactory',
  'Main-Category', 'mainCategory',
  'Sub-Category', 'subCategory',
  'subtotal', 'summary', 'total'
];

patterns.forEach(p => {
  if (seedScript.includes(p)) {
    console.log(`  FOUND: "${p}"`);
  } else {
    console.log(`  MISSING: "${p}"`);
  }
});

console.log('\n=== PHASE 2 AUDIT COMPLETE ===');
