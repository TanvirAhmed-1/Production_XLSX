import XLSX from 'xlsx';

function matchExactTargets() {
  const filePath = './Birichina- Month of October Sign off Production Plan- 26th October.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Birichina'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const header = rows[0];
  const dateCols = [];
  for (let c = 35; c < header.length; c++) {
    const val = header[c];
    if (typeof val === 'number' && val > 40000 && val < 50000) {
      dateCols.push({ col: c, serial: val, dateStr: XLSX.SSF.format('yyyy-mm-dd', val) });
    }
  }

  console.log(`Date cols: ${dateCols.length}`);

  // Check all rows and check column 2 (Unit) vs line string prefix
  const unitTotals = {
    B2: 0,
    U03: 0,
    U02: 0,
    U04: 0
  };

  let allRowsPlanned = 0;
  let planDayRowsPlanned = 0;
  let styleRowsPlanned = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const lineName = (r[0] || '').toString().trim();
    const rawUnit = (r[2] || '').toString().trim();
    const col33 = (r[33] || '').toString().trim();

    let rowPlan = 0;
    for (const d of dateCols) {
      const v = typeof r[d.col] === 'number' ? r[d.col] : 0;
      rowPlan += v;
    }

    if (rowPlan > 0) {
      allRowsPlanned += rowPlan;
      if (col33 === 'Plan/Day') {
        planDayRowsPlanned += rowPlan;
      } else if (col33 === 'SAH') {
        // SAH row
      } else {
        styleRowsPlanned += rowPlan;
        
        let u = rawUnit;
        if (lineName.startsWith('U02') || rawUnit.includes('U02') || rawUnit.includes('B1U2')) u = 'U02';
        else if (lineName.startsWith('U03') || rawUnit.includes('U03') || rawUnit.includes('B1U3')) u = 'U03';
        else if (lineName.startsWith('U04') || rawUnit.includes('U04') || rawUnit.includes('B1U4')) u = 'U04';
        else if (lineName.startsWith('B2') || rawUnit.includes('B2')) u = 'B2';
        else u = 'U02';

        if (unitTotals[u] !== undefined) {
          unitTotals[u] += rowPlan;
        }
      }
    }
  }

  console.log('All Rows Planned Sum:', allRowsPlanned);
  console.log('Plan/Day Rows Planned Sum:', planDayRowsPlanned);
  console.log('Style Rows Planned Sum:', styleRowsPlanned);
  console.log('Unit Totals from Style Rows:', unitTotals);

  // Check column 10/11/12 (e.g. Plan Qty column in Excel)
  console.log('\nHeader columns 10-35:');
  for (let c = 10; c < 35; c++) {
    console.log(`Col ${c}: "${header[c]}"`);
  }

  let col11PlanSum = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const col33 = (r[33] || '').toString().trim();
    if (col33 !== 'Plan/Day' && col33 !== 'SAH') {
      const v = typeof r[11] === 'number' ? r[11] : 0;
      col11PlanSum += v;
    }
  }
  console.log('\nColumn 11 ("Plan Qty") Sum:', col11PlanSum);
}

matchExactTargets();
