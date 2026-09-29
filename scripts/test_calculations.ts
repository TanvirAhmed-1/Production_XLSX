import {
  calculateSingleSAH,
  calculateMachineHour,
  calculateWorkingHour,
  calculateEfficiency,
  calculateVariance,
  computeRunningLines,
  generateFullReportDTO,
} from '../src/lib/calculations/index';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertClose(actual: number, expected: number, tolerance = 0.001, message: string) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  ✅ PASS: ${message} (Actual: ${actual.toFixed(4)}, Expected: ${expected.toFixed(4)})`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (Actual: ${actual}, Expected: ${expected})`);
    failed++;
  }
}

console.log('🧪 Starting Garments Calculation Engine Unit Tests...\n');

// 1. SAH Test (Section 49 prompt requirement: Input: qty = 1000, smv = 12 -> Expected: SAH = 200)
console.log('1. SAH Calculation');
const sah = calculateSingleSAH(1000, 12);
assertClose(sah, 200, 0.0001, 'SAH = 1000 * 12 / 60');

// 2. Machine Hour Test (Section 49 prompt requirement: Input: manpower = 30, shiftHours = 10 -> Expected: Machine Hour = 300)
console.log('\n2. Machine Hour Calculation');
const mh = calculateMachineHour(30, 10);
assertClose(mh, 300, 0.0001, 'Machine Hour = 30 * 10');

// 3. Working Hour Test (Section 49 prompt requirement: Input: machineHour = 300, manpower = 30 -> Expected: Working Hour = 10)
console.log('\n3. Working Hour Calculation');
const wh = calculateWorkingHour(300, 30);
assertClose(wh, 10, 0.0001, 'Working Hour = 300 / 30');

// 4. Efficiency Test (Section 49 prompt requirement: Input: SAH = 200, Machine Hour = 300 -> Expected: Efficiency = 66.6667%)
console.log('\n4. Efficiency Calculation');
const eff = calculateEfficiency(200, 300);
assertClose(eff, 66.6667, 0.001, 'Efficiency = (200 / 300) * 100');

// Zero Machine Hour Safety (Section 34: no NaN, no Infinity)
const effZero = calculateEfficiency(200, 0);
assert(effZero === 0, 'Efficiency with 0 Machine Hours is 0% (no NaN or Infinity)');

// 5. Budget Variance Test (Section 49 prompt requirement: Input: actual = 5500, budget = 5000 -> Expected: Variance = +500)
console.log('\n5. Budget Variance Calculation');
const variance = calculateVariance(5500, 5000);
assertClose(variance, 500, 0.0001, 'Variance = 5500 - 5000');

// 6. Running Lines Test (Section 49 prompt requirement)
console.log('\n6. Running Lines Calculation');
const mockRows = [
  {
    unit: 'B1U2',
    line: 'U02-01',
    manpower: 25,
    styleRef: 'STYLE-A',
    buyer: 'MS',
    smv: 10,
    orderQty: 5000,
    planQty: 5000,
    daily: { '2026-10-01': 500, '2026-10-02': 0 }
  },
  {
    unit: 'B1U2',
    line: 'U02-02',
    manpower: 25,
    styleRef: 'STYLE-B',
    buyer: 'GAP',
    smv: 15,
    orderQty: 4000,
    planQty: 4000,
    daily: { '2026-10-01': 300, '2026-10-02': 400 }
  },
  {
    unit: 'B1U2',
    line: 'U02-03',
    manpower: 25,
    styleRef: 'STYLE-C',
    buyer: 'HEMA',
    smv: 12,
    orderQty: 2000,
    planQty: 2000,
    daily: { '2026-10-01': 0, '2026-10-02': 0 } // Idle line
  }
];

const rlResult = computeRunningLines(mockRows, ['2026-10-01', '2026-10-02'], { B1U2: 3 });
assert(rlResult.unitRows[0].values[0] === 2, '2026-10-01 has 2 running lines');
assert(rlResult.unitRows[0].values[1] === 1, '2026-10-02 has 1 running line');
assert(rlResult.unitRows[0].idleValues[0] === 1, '2026-10-01 has 1 idle line (3 - 2)');
assert(rlResult.unitRows[0].idleValues[1] === 2, '2026-10-02 has 2 idle lines (3 - 1)');

// 7. Group & Factory Aggregations Test
console.log('\n7. Group & Factory Aggregations');
const report = generateFullReportDTO({
  importId: 'test-import',
  fileName: 'test.xlsx',
  rows: mockRows,
  dateKeys: ['2026-10-01', '2026-10-02'],
  capacities: { B1U2: 3 },
  unitShiftHours: { B1U2: 10 }
});

assert(report.summary.totalPlanPCS === 1200, 'Total Plan PCS = 500 + 300 + 400 = 1200');
assertClose(report.summary.totalSAH, (500*10 + 300*15 + 400*15)/60, 0.01, 'Total SAH correctly calculated');
assert(report.summary.activeLines === 2, '2 active lines with production');

console.log(`\n🎉 Tests complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
