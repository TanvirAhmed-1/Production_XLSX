import fs from 'fs';

async function testUploadAndVerify() {
  const filePath = './Birichina- Month of October Sign off Production Plan- 26th October.xlsx';
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const formData = new FormData();
  formData.append('file', blob, 'Birichina_Verified_SignOff_Plan.xlsx');

  console.log('Sending Excel upload & 2-pass verification request...');
  const res = await fetch('http://localhost:3000/api/excel/import', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    console.error('Import failed:', res.status, await res.text());
    return;
  }

  const result = await res.json();
  console.log('\n=== IMPORT & 2-STEP RE-CHECK RESULT ===');
  console.log(`Success: ${result.success}`);
  console.log(`Message: ${result.message}`);
  console.log(`Imported Orders: ${result.importedRows}`);
  console.log(`Daily Records:   ${result.dailyCount}`);
  console.log(`Physical Lines:  ${result.linesCount}`);
  console.log(`Buyers:          ${result.buyersCount}`);
  
  if (result.verification) {
    console.log('\n=== 2ND-PASS AUDIT VERIFICATION CHECKS ===');
    console.log(`Verification Passed: ${result.verification.passed} (${result.verification.checksPassed}/${result.verification.totalChecks} checks)`);
    result.verification.checks.forEach(c => {
      console.log(`   [${c.status}] ${c.name}: Expected = ${c.expected} | Actual = ${c.actual}`);
    });
    console.log(`DB Planned Qty: ${result.verification.dbPlannedQty.toLocaleString()} pcs`);
    console.log(`DB Actual Qty:  ${result.verification.dbActualQty.toLocaleString()} pcs`);
    console.log(`Unit Breakdown:`, result.verification.unitBreakdown);
    console.log(`Efficiency:     ${result.verification.efficiency}%`);
    console.log(`Achievement:    ${result.verification.achievement}%`);
  }
}

testUploadAndVerify().catch(console.error);
