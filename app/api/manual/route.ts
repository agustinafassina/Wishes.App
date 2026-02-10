import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'MANUAL_DE_USO.md');
    const content = await readFile(filePath, 'utf8');
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Manual-de-uso-Wishes.md"',
      },
    });
  } catch (error) {
    console.error('Error serving manual:', error);
    return NextResponse.json({ error: 'Manual not found' }, { status: 404 });
  }
}
