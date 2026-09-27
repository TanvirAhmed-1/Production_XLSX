import { getDashboardData } from '../src/lib/analytics-service.ts';
import prisma from '../src/lib/prisma.ts';

async function testDash() {
  const data = await getDashboardData();
  console.log('--- DASHBOARD DATA TEST ---');
  console.log(`KPI Total Active Lines: ${data.kpis.totalActiveLines}`);
  console.log(`KPI Total Registered Lines: ${data.kpis.totalRegisteredLines}`);
  console.log(`Line Performance Count: ${data.linePerformance.length}`);
  
  const unitBreakdown = {};
  data.linePerformance.forEach(l => {
    unitBreakdown[l.unitCode] = (unitBreakdown[l.unitCode] || 0) + 1;
  });
  console.log('Line Performance by Unit:', unitBreakdown);

  console.log(`Total Planned: ${data.kpis.totalPlannedProduction.toLocaleString()}`);
  console.log(`Total Actual:  ${data.kpis.totalActualProduction.toLocaleString()}`);
  console.log(`Achievement:   ${data.kpis.targetAchievementRate}%`);
  console.log(`Efficiency:    ${data.kpis.averageEfficiency}%`);
  console.log(`Total SAH:     ${data.kpis.totalSAH.toLocaleString()}`);
  console.log(`Total Manpower:${data.kpis.totalManpower.toLocaleString()}`);
  console.log('--- END TEST ---');
}

testDash().catch(console.error).finally(() => prisma.$disconnect());
