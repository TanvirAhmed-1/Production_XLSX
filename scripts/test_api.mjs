async function testApi() {
  const res = await fetch('http://localhost:3000/api/analytics/dashboard');
  if (!res.ok) {
    console.error('API request failed:', res.status, await res.text());
    return;
  }
  const data = await res.json();
  console.log('=== API ANALYTICS DASHBOARD RESPONSE ===');
  console.log(`Total Active Lines: ${data.kpis.totalActiveLines}`);
  console.log(`Total Registered Lines: ${data.kpis.totalRegisteredLines}`);
  console.log(`Line Performance Array Length: ${data.linePerformance.length}`);
  
  const unitBreakdown = {};
  data.linePerformance.forEach(l => {
    unitBreakdown[l.unitCode] = (unitBreakdown[l.unitCode] || 0) + 1;
  });
  console.log('Lines breakdown by unit:', unitBreakdown);

  console.log(`Planned Qty:       ${data.kpis.totalPlannedProduction.toLocaleString()} pcs`);
  console.log(`Actual Qty:        ${data.kpis.totalActualProduction.toLocaleString()} pcs`);
  console.log(`Production Gap:    ${data.kpis.totalGap.toLocaleString()} pcs`);
  console.log(`Achievement Rate:  ${data.kpis.targetAchievementRate}%`);
  console.log(`Average Efficiency:${data.kpis.averageEfficiency}%`);
  console.log(`Total SAH:         ${data.kpis.totalSAH.toLocaleString()} hrs`);
  console.log(`Total Manpower:    ${data.kpis.totalManpower.toLocaleString()}`);

  console.log('\nUnit Performance Array:');
  data.unitPerformance.forEach(u => {
    console.log(`   - [${u.unitCode}] ${u.unitName}: ${u.totalLines} lines | Planned: ${u.target.toLocaleString()} | Actual: ${u.actual.toLocaleString()} | Ach: ${u.achievementRate}% | Eff: ${u.efficiency}%`);
  });
}

testApi().catch(console.error);
