export type UnitCode = 'B1U2' | 'B1U3' | 'B1U4' | 'B2U2' | 'B2U3' | string;

export interface StylePlanRow {
  id?: string;
  unit: string;
  line: string;
  manpower: number;
  styleRef: string;
  article?: string | null;
  buyer: string;
  type?: string | null;
  smv: number;
  orderQty: number;
  planQty: number;
  psd?: string | Date | null;
  daily: Record<string, number>; // dateKey ('YYYY-MM-DD') -> quantity
}

export type DirectRecapMap = Record<string, Record<string, Record<string, number>>>; // unit -> line -> dateKey -> number

export interface CalculationAuditRow {
  styleRef: string;
  buyer: string;
  article?: string | null;
  line: string;
  qty: number;
  smv: number;
  calculatedSAH: number;
  formula: string;
}

export interface CalculationAuditDetail {
  metric: string;
  unit?: string;
  line?: string;
  dateKey?: string;
  totalValue: number;
  formulaDescription: string;
  isDirectRecap: boolean;
  directRecapValue?: number | null;
  rowsUsed: CalculationAuditRow[];
}

export interface UnitSummaryResult {
  unitCode: string;
  unitName: string;
  group: 'B1' | 'B2' | string;
  activeLines: number;
  capacity: number;
  planPCS: number;
  sah: number;
  machineHour: number;
  workingHour: number;
  efficiency: number; // percentage (e.g. 68.94)
  budgetPCS?: number;
  budgetSAH?: number;
  budgetClockHour?: number;
  budgetEfficiency?: number;
  variancePCS?: number;
  varianceSAH?: number;
  varianceClockHour?: number;
  varianceEfficiency?: number;
}

export interface GroupSummaryResult {
  groupName: string;
  units: UnitSummaryResult[];
  activeLines: number;
  capacity: number;
  planPCS: number;
  sah: number;
  machineHour: number;
  workingHour: number;
  efficiency: number; // total SAH / total Machine Hour * 100
  budgetPCS?: number;
  budgetSAH?: number;
  budgetClockHour?: number;
  budgetEfficiency?: number;
  variancePCS?: number;
  varianceSAH?: number;
  varianceEfficiency?: number;
}

export interface DailySummaryResult {
  dateKey: string;
  isWeeklyOff: boolean; // e.g. Friday
  planPCS: number;
  sah: number;
  machineHour: number;
  workingHour: number;
  efficiency: number;
  runningLines: number;
  availableCapacity: number;
  idleLines: number;
}

export interface ProductionReportDTO {
  importId: string;
  fileName: string;
  dateKeys: string[];
  summary: {
    totalPlanPCS: number;
    totalSAH: number;
    totalMachineHour: number;
    totalWorkingHour: number;
    overallEfficiency: number;
    activeLines: number;
    totalStyles: number;
    totalBuyers: number;
    totalCapacity: number;
    budgetVariancePCS?: number;
    budgetVarianceSAH?: number;
    budgetVarianceEfficiency?: number;
  };
  units: UnitSummaryResult[];
  groups: {
    b1: GroupSummaryResult;
    b2: GroupSummaryResult;
    total: GroupSummaryResult;
  };
  daily: DailySummaryResult[];
  buyerStats: Array<{
    buyer: string;
    orderQty: number;
    planQty: number;
    sah: number;
    styleCount: number;
    sharePct: number;
  }>;
  styleStats: Array<{
    styleRef: string;
    buyer: string;
    article?: string | null;
    smv: number;
    orderQty: number;
    planQty: number;
    sah: number;
    lines: string[];
  }>;
}
