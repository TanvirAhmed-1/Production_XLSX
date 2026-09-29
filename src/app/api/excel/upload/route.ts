import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { parseExcelWorkbook } from "@/lib/excel/parser";
import { importExcelToDatabase } from "@/lib/excel/importer";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Invalid format. Only .xlsx or .xls Excel files are supported." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

    // Parse Excel Workbook
    const parsed = parseExcelWorkbook(workbook, file.name);

    if (parsed.validRows === 0) {
      return NextResponse.json(
        {
          error: "No valid production plan rows found in the uploaded Excel workbook.",
          sheetNames: workbook.SheetNames,
        },
        { status: 422 }
      );
    }

    // Save into PostgreSQL
    const importResult = await importExcelToDatabase(parsed, file.name, file.size);

    return NextResponse.json({
      success: true,
      importResult,
      validation: {
        totalSheets: parsed.totalSheets,
        sheetNames: parsed.sheetNames,
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        invalidRows: parsed.invalidRows,
        datesFound: parsed.dateKeys.length,
        sahRecapFound: importResult.sahRecapFound,
        machineHrRecapFound: importResult.machineHrRecapFound,
        warnings: parsed.validationErrors,
      },
    });
  } catch (error: unknown) {
    console.error("Excel upload processing failed:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
