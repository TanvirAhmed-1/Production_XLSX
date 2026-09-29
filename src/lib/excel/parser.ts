import * as XLSX from "xlsx";
import { StylePlanRow, DirectRecapMap } from "../calculations/types";
import { UNIT_ORDER, UNIT_LABEL } from "../calculations/running-lines";

export interface ParsedExcelResult {
  fileName: string;
  totalSheets: number;
  sheetNames: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  dateKeys: string[];
  month: string;
  rows: StylePlanRow[];
  sahDirect: DirectRecapMap;
  machineHourDirect: DirectRecapMap;
  capacities: Record<string, number>;
  rawRows: Array<{
    sheetName: string;
    rowNumber: number;
    rawData: Record<string, unknown>;
  }>;
  validationErrors: Array<{
    sheetName: string;
    rowNumber: number;
    columnName?: string;
    errorType: string;
    message: string;
    rawValue?: string;
  }>;
}

const HEADER_ALIASES = {
  line: ["line"],
  manpower: ["man-power", "manpower", "mp"],
  unit: ["unit"],
  styleRef: ["style ref.", "style ref", "styleref", "style"],
  article: ["article"],
  buyer: ["buyer"],
  type: ["type"],
  smv: ["smv"],
  psd: ["psd"],
  orderQty: ["odr qty", "order qty", "order quantity"],
  planQty: ["plan qty", "planned qty"],
  planDayLabel: ["plan/day"],
};

export function normalizeUnit(rawUnit: unknown, lineStr: unknown): string {
  const u = String(rawUnit || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (u === "B1U2" || u === "U02" || u === "U2") return "B1U2";
  if (u === "B1U3" || u === "U03" || u === "U3") return "B1U3";
  if (u === "B1U4" || u === "U04" || u === "U4") return "B1U4";
  if (u === "B2U2") return "B2U2";
  if (u === "B2U3") return "B2U3";
  if (u.startsWith("B2")) return "B2U2"; // default B2 unit

  const ln = String(lineStr || "").trim().toUpperCase();
  if (ln.includes("U02") || ln.includes("B1U2")) return "B1U2";
  if (ln.includes("U03") || ln.includes("B1U3")) return "B1U3";
  if (ln.includes("U04") || ln.includes("B1U4")) return "B1U4";
  if (ln.includes("B2U2")) return "B2U2";
  if (ln.includes("B2U3")) return "B2U3";
  if (ln.startsWith("B2")) return "B2U2";

  return u || "B1U2";
}

function findColIndex(headerRow: unknown[], aliases: string[]): number {
  if (!Array.isArray(headerRow)) return -1;
  for (let i = 0; i < headerRow.length; i++) {
    const val = String(headerRow[i] || "").trim().toLowerCase();
    if (aliases.some(a => val === a || val.includes(a))) {
      return i;
    }
  }
  return -1;
}

export function parseExcelWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string = "Production_Plan.xlsx"
): ParsedExcelResult {
  const rows: StylePlanRow[] = [];
  const rawRows: ParsedExcelResult["rawRows"] = [];
  const validationErrors: ParsedExcelResult["validationErrors"] = [];
  const dateKeySet = new Set<string>();

  const sahDirect: DirectRecapMap = {};
  const machineHourDirect: DirectRecapMap = {};
  UNIT_ORDER.forEach(u => {
    sahDirect[u] = {};
    machineHourDirect[u] = {};
  });

  let totalRowCount = 0;
  let validRowCount = 0;
  let invalidRowCount = 0;

  // Determine sheet to process: if sheet 'Birichina' exists, process it, otherwise all sheets
  const sheetsToProcess = workbook.SheetNames.includes("Birichina")
    ? ["Birichina"]
    : workbook.SheetNames.filter(name => !["summary", "recap"].includes(name.toLowerCase()));

  sheetsToProcess.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const aoa: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: true,
    });
    if (!aoa || aoa.length === 0) return;

    totalRowCount += aoa.length;

    // Find header row (must contain line or style ref)
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, aoa.length); r++) {
      const row = aoa[r];
      if (Array.isArray(row)) {
        const text = row.map(c => String(c || "").toLowerCase()).join(" ");
        if (text.includes("line") && (text.includes("style") || text.includes("smv") || text.includes("buyer"))) {
          headerRowIdx = r;
          break;
        }
      }
    }
    if (headerRowIdx === -1) headerRowIdx = 0;

    const header = aoa[headerRowIdx] || [];
    const cLine = findColIndex(header, HEADER_ALIASES.line);
    const cMp = findColIndex(header, HEADER_ALIASES.manpower);
    const cUnit = findColIndex(header, HEADER_ALIASES.unit);
    const cStyle = findColIndex(header, HEADER_ALIASES.styleRef);
    const cArt = findColIndex(header, HEADER_ALIASES.article);
    const cBuyer = findColIndex(header, HEADER_ALIASES.buyer);
    const cType = findColIndex(header, HEADER_ALIASES.type);
    const cSmv = findColIndex(header, HEADER_ALIASES.smv);
    const cPsd = findColIndex(header, HEADER_ALIASES.psd);
    const cOdrQty = findColIndex(header, HEADER_ALIASES.orderQty);
    const cPlanQty = findColIndex(header, HEADER_ALIASES.planQty);
    const cPlanDay = findColIndex(header, HEADER_ALIASES.planDayLabel);

    // Identify Date Columns
    const dateCols: Array<{ idx: number; key: string }> = [];
    header.forEach((cellVal, idx) => {
      let dKey: string | null = null;
      if (cellVal instanceof Date) {
        dKey = cellVal.toISOString().slice(0, 10);
      } else if (typeof cellVal === "number" && cellVal > 40000 && cellVal < 55000) {
        const parsed = XLSX.SSF.parse_date_code(cellVal);
        dKey = `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      } else if (typeof cellVal === "string" && cellVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dKey = cellVal;
      }
      if (dKey) {
        dateCols.push({ idx, key: dKey });
        dateKeySet.add(dKey);
      }
    });

    let recapTargetLine: string | null = null;
    let recapTargetUnit: string | null = null;

    for (let r = headerRowIdx + 1; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row || row.every(c => c === null || c === undefined || c === "")) continue;

      // Preserve raw row
      const rawObj: Record<string, unknown> = {};
      row.forEach((v, colIdx) => {
        if (v !== null && v !== undefined) rawObj[`col_${colIdx}`] = v;
      });
      rawRows.push({
        sheetName,
        rowNumber: r + 1,
        rawData: rawObj,
      });

      const lineVal = cLine >= 0 ? row[cLine] : null;
      const lineStr = lineVal ? String(lineVal).trim() : "";
      const validLine = lineStr && lineStr !== "-";

      const unitRaw = cUnit >= 0 ? row[cUnit] : null;
      const unit = normalizeUnit(unitRaw, lineStr);

      const planDayLabel = cPlanDay >= 0 ? String(row[cPlanDay] || "").trim() : "";
      const styleRef = cStyle >= 0 && row[cStyle] ? String(row[cStyle]).trim() : "";
      const buyer = cBuyer >= 0 && row[cBuyer] ? String(row[cBuyer]).trim() : "";
      const article = cArt >= 0 && row[cArt] ? String(row[cArt]).trim() : "";

      const hasIdentity = (styleRef && styleRef !== "-") || (buyer && buyer !== "-") || (article && article !== "-");

      // Handle Recap Rows (Plan/Day, SAH, Machine HR, Effi. plan/D)
      if (planDayLabel === "Plan/Day" && !hasIdentity) {
        recapTargetLine = validLine ? lineStr : null;
        recapTargetUnit = validLine ? unit : null;
        continue;
      }
      if (planDayLabel === "SAH" && recapTargetLine && recapTargetUnit) {
        if (!sahDirect[recapTargetUnit]) sahDirect[recapTargetUnit] = {};
        if (!sahDirect[recapTargetUnit][recapTargetLine]) sahDirect[recapTargetUnit][recapTargetLine] = {};

        dateCols.forEach(dc => {
          const val = Number(row[dc.idx]);
          if (!isNaN(val)) {
            sahDirect[recapTargetUnit!][recapTargetLine!][dc.key] = val;
          }
        });
        continue;
      }
      if (planDayLabel === "Machine HR" && recapTargetLine && recapTargetUnit) {
        if (!machineHourDirect[recapTargetUnit]) machineHourDirect[recapTargetUnit] = {};
        if (!machineHourDirect[recapTargetUnit][recapTargetLine]) machineHourDirect[recapTargetUnit][recapTargetLine] = {};

        dateCols.forEach(dc => {
          const val = Number(row[dc.idx]);
          if (!isNaN(val)) {
            machineHourDirect[recapTargetUnit!][recapTargetLine!][dc.key] = val;
          }
        });
        continue;
      }
      if (planDayLabel === "Effi. plan/D") {
        continue;
      }

      // If no valid identity, treat as non-order/summary or invalid
      if (!hasIdentity) {
        invalidRowCount++;
        continue;
      }

      // Validate SMV
      const rawSmv = cSmv >= 0 ? Number(row[cSmv]) : 0;
      const smv = isNaN(rawSmv) || rawSmv < 0 ? 0 : rawSmv;
      if (smv === 0) {
        validationErrors.push({
          sheetName,
          rowNumber: r + 1,
          columnName: "SMV",
          errorType: "WARNING",
          message: `Style ${styleRef || "unknown"} has SMV of 0`,
          rawValue: String(row[cSmv] || ""),
        });
      }

      // Daily Quantities
      const daily: Record<string, number> = {};
      let sumDaily = 0;
      dateCols.forEach(dc => {
        const q = Number(row[dc.idx]);
        const cleanQ = isNaN(q) || q < 0 ? 0 : Math.round(q);
        daily[dc.key] = cleanQ;
        sumDaily += cleanQ;
      });

      const orderQty = cOdrQty >= 0 && !isNaN(Number(row[cOdrQty])) ? Math.round(Number(row[cOdrQty])) : sumDaily;
      const planQty = cPlanQty >= 0 && !isNaN(Number(row[cPlanQty])) ? Math.round(Number(row[cPlanQty])) : sumDaily;
      const manpower = cMp >= 0 && !isNaN(Number(row[cMp])) ? Math.round(Number(row[cMp])) : 25;

      rows.push({
        unit,
        line: lineStr,
        manpower,
        styleRef: styleRef || "GENERIC",
        article: article || null,
        buyer: buyer || "Unknown",
        type: cType >= 0 && row[cType] ? String(row[cType]).trim() : null,
        smv,
        orderQty,
        planQty: planQty || sumDaily,
        daily,
      });

      validRowCount++;
    }
  });

  const sortedDateKeys = Array.from(dateKeySet).sort();
  const month = sortedDateKeys[0] ? sortedDateKeys[0].slice(0, 7) : "2026-10";

  // Capacities
  const capacities: Record<string, number> = {};
  UNIT_ORDER.forEach(u => {
    capacities[u] = new Set(rows.filter(r => r.unit === u && r.line).map(r => r.line)).size;
  });

  return {
    fileName,
    totalSheets: workbook.SheetNames.length,
    sheetNames: workbook.SheetNames,
    totalRows: totalRowCount,
    validRows: validRowCount,
    invalidRows: invalidRowCount,
    dateKeys: sortedDateKeys,
    month,
    rows,
    sahDirect,
    machineHourDirect,
    capacities,
    rawRows,
    validationErrors,
  };
}
