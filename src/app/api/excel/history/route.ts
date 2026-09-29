import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const imports = await prisma.excelImport.findMany({
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        fileName: true,
        originalFileName: true,
        fileSize: true,
        uploadedAt: true,
        processedAt: true,
        status: true,
        totalSheets: true,
        totalRows: true,
        validRows: true,
        invalidRows: true,
        month: true,
      },
    });

    return NextResponse.json({ success: true, imports });
  } catch (error: unknown) {
    console.error("Failed to fetch import history:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
