import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { parseExcelWorkbook } from "../src/lib/excel/parser";
import { importExcelToDatabase } from "../src/lib/excel/importer";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🚀 Starting Production Database Seeding from Excel...");

  const filePath = path.resolve("Birichina- Month of October Sign off Production Plan- 26th October.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error("❌ File not found:", filePath);
    process.exit(1);
  }

  // Clear existing records for clean seed
  console.log("🧹 Cleaning old records...");
  await prisma.productionPlanDaily.deleteMany();
  await prisma.productionPlan.deleteMany();
  await prisma.lineDailySAH.deleteMany();
  await prisma.lineDailyMachineHour.deleteMany();
  await prisma.excelImport.deleteMany();

  const stat = fs.statSync(filePath);
  console.log(`📁 File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  console.log(`📑 Sheets detected: ${workbook.SheetNames.join(", ")}`);

  console.log("⚙️  Parsing Excel contents and recap blocks...");
  const parsed = parseExcelWorkbook(workbook, path.basename(filePath));
  console.log(`✅ Parsed ${parsed.validRows} valid production rows across ${parsed.dateKeys.length} days`);
  console.log(`✅ Recap SAH units: ${Object.keys(parsed.sahDirect).join(", ")}`);
  console.log(`✅ Recap Machine HR units: ${Object.keys(parsed.machineHourDirect).join(", ")}`);

  console.log("💾 Batch importing into PostgreSQL database via Prisma...");
  const startTime = Date.now();
  const result = await importExcelToDatabase(parsed, path.basename(filePath), stat.size);
  console.log(`⚡ Import finished in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  console.log("🎉 Database Seed Completed Successfully!");
  console.log("📊 Summary:", JSON.stringify(result, null, 2));

  const totalPlans = await prisma.productionPlan.count();
  const totalDailies = await prisma.productionPlanDaily.count();
  const totalSAHs = await prisma.lineDailySAH.count();
  const totalMHs = await prisma.lineDailyMachineHour.count();

  console.log({
    totalPlansInDB: totalPlans,
    totalDailiesInDB: totalDailies,
    totalLineDailySAHInDB: totalSAHs,
    totalLineDailyMachineHourInDB: totalMHs,
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
