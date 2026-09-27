import { NextRequest, NextResponse } from 'next/server';
import { parseAndImportExcel } from '@/lib/excel-importer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No Excel file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseAndImportExcel(buffer, file.name);

    if (!result.success) {
      return NextResponse.json({ error: result.message, details: result.errors }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Import API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process Excel import' }, { status: 500 });
  }
}
