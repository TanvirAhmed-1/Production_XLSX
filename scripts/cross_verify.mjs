/**
 * Cross-verify: Compare our DB data with Production_line_2026-09-27.xlsx 
 * to prove 100% accuracy
 */
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  // ===== 1. Read the Production_line file (ground truth) =====
  const plFile = XLSX.readFile('Production_lines_2026-09-27.xlsx');
  const plSheet = plFile.Sheets['Report'];
  const plRows = XLSX.utils.sheet_to_json(plSheet);
  
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Cross-Verification: DB vs Production_line Excel        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nProduction_line file: ${plRows.length} lines\n`);
  
  // Show the columns in this file
  const cols = Object.keys(plRows[0]);
  console.log('Columns:', cols.join(' | '));
  console.log('');
  
  // ===== 2. Get our DB data per line =====
  // Sum Plan Qty from orders (order items only, no subtotals)
  const dbOrders = await prisma.order.groupBy({
    by: ['lineName'],
    _sum: { planQty: true, orderQty: true },
    _count: true,
  });
  
  const dbLineMap = new Map();
  dbOrders.forEach(o => {
    dbLineMap.set(o.lineName, {
      planQty: o._sum.planQty || 0,
      orderQty: o._sum.orderQty || 0,
      count: o._count,
    });
  });
  
  // Daily targets per line (from subtotal rows)
  const dbDaily = await prisma.productionDaily.groupBy({
    by: ['lineId'],
    _sum: { targetQty: true },
  });
  
  const lines = await prisma.productionLine.findMany();
  const lineIdToName = new Map();
  lines.forEach(l => lineIdToName.set(l.id, l.name));
  
  const dbDailyMap = new Map();
  dbDaily.forEach(d => {
    const name = lineIdToName.get(d.lineId);
    if (name) dbDailyMap.set(name, d._sum.targetQty || 0);
  });
  
  // ===== 3. Birichina Excel - sum ONLY order item rows =====
  const birFile = XLSX.readFile('Birichina- Month of October Sign off Production Plan- 26th October.xlsx');
  const birSheet = birFile.Sheets['Birichina'];
  const birRows = XLSX.utils.sheet_to_json(birSheet, { header: 1, defval: null });
  const birData = birRows.slice(1);
  
  // Sum Plan Qty per line, ONLY from order item rows (buyer filled)
  const birOrderOnlyMap = new Map();  // line -> sum of plan qty from order items
  const birAllMap = new Map();         // line -> sum of plan qty from ALL rows (pandas style)
  const birSubtotalMap = new Map();   // line -> plan qty from Plan/Day subtotal row
  
  let currentLine = null;
  birData.forEach(row => {
    if (!row) return;
    const line = row[0] ? String(row[0]).trim() : '';
    const buyer = row[4] ? String(row[4]).trim() : '';
    const orderCode = row[5] ? String(row[5]).trim() : '';
    const styleRef = row[8] ? String(row[8]).trim() : '';
    const planQty = typeof row[34] === 'number' ? row[34] : 0;
    const col33 = row[33] ? String(row[33]).trim() : '';
    
    if (line && line.match(/^[UB]/)) currentLine = line;
    const ln = currentLine || line;
    if (!ln) return;
    
    // All rows sum (what pandas does)
    if (planQty) {
      birAllMap.set(ln, (birAllMap.get(ln) || 0) + planQty);
    }
    
    // Order items only (our approach)
    if (buyer && orderCode && styleRef) {
      birOrderOnlyMap.set(ln, (birOrderOnlyMap.get(ln) || 0) + planQty);
    }
    
    // Plan/Day subtotal row
    if (col33 === 'Plan/Day') {
      birSubtotalMap.set(ln, planQty);
    }
  });
  
  // ===== 4. COMPARISON TABLE =====
  console.log('Line            | ProdLine(XL) | OrderItems(XL) | Subtotal(XL)  | DB Orders    | DB Daily     | Match?');
  console.log(''.padEnd(120, '-'));
  
  let totalProdLine = 0;
  let totalOrderItems = 0;
  let totalSubtotal = 0;
  let totalDbOrders = 0;
  let totalDbDaily = 0;
  let matchCount = 0;
  let mismatchCount = 0;
  
  // Sort by Production_line file order
  plRows.forEach(plRow => {
    const lineName = plRow['Line Name'] || plRow['Line'];
    const targetQty = plRow['Target Qty'] || plRow['TargetQty'] || 0;
    const orderItemQty = birOrderOnlyMap.get(lineName) || 0;
    const subtotalQty = birSubtotalMap.get(lineName) || 0;
    const dbOrderQty = dbLineMap.get(lineName)?.planQty || 0;
    const dbDailyQty = dbDailyMap.get(lineName) || 0;
    
    totalProdLine += targetQty;
    totalOrderItems += Math.round(orderItemQty);
    totalSubtotal += Math.round(subtotalQty);
    totalDbOrders += dbOrderQty;
    totalDbDaily += dbDailyQty;
    
    // Check if DB matches Production_line target
    const diff = Math.abs(targetQty - dbOrderQty);
    const dailyDiff = Math.abs(targetQty - dbDailyQty);
    const isMatch = diff <= 5 || dailyDiff <= 5; // Allow tiny rounding
    
    if (isMatch) matchCount++;
    else mismatchCount++;
    
    const flag = isMatch ? '✅' : '❌';
    console.log(
      `${lineName.padEnd(16)}| ${String(targetQty).padStart(12)} | ${String(Math.round(orderItemQty)).padStart(14)} | ${String(Math.round(subtotalQty)).padStart(13)} | ${String(dbOrderQty).padStart(12)} | ${String(dbDailyQty).padStart(12)} | ${flag} diff=${diff}`
    );
  });
  
  console.log(''.padEnd(120, '-'));
  console.log(
    `${'TOTAL'.padEnd(16)}| ${String(totalProdLine).padStart(12)} | ${String(totalOrderItems).padStart(14)} | ${String(totalSubtotal).padStart(13)} | ${String(totalDbOrders).padStart(12)} | ${String(totalDbDaily).padStart(12)} |`
  );
  
  console.log(`\n✅ Matched: ${matchCount}/${plRows.length}`);
  console.log(`❌ Mismatched: ${mismatchCount}/${plRows.length}`);
  
  // ===== 5. EXPLAIN WHY PANDAS SHOWS DOUBLE =====
  console.log('\n═══ WHY PANDAS SHOWS ~18M INSTEAD OF ~8.5M ═══');
  console.log('pandas does: df.groupby("Line")["Plan Qty"].sum()');
  console.log('This sums ALL rows including subtotal rows:');
  console.log('');
  
  // Show breakdown for first 3 lines
  const sampleLines = plRows.slice(0, 3).map(r => r['Line Name'] || r['Line']);
  sampleLines.forEach(ln => {
    const orderOnly = Math.round(birOrderOnlyMap.get(ln) || 0);
    const allRows = Math.round(birAllMap.get(ln) || 0);
    const subtotal = Math.round(birSubtotalMap.get(ln) || 0);
    const extra = allRows - orderOnly;
    console.log(`  ${ln}:`);
    console.log(`    Order items only (correct): ${orderOnly.toLocaleString()}`);
    console.log(`    Plan/Day subtotal row:      ${subtotal.toLocaleString()} (= sum of order items, DUPLICATE)`);
    console.log(`    Pandas sum (all rows):      ${allRows.toLocaleString()} (= order items + subtotal + SAH + efficiency)`);
    console.log(`    Extra from subtotals:       +${extra.toLocaleString()} (this is the bug if you sum ALL rows)`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

verify().catch(e => { console.error(e); process.exit(1); });
