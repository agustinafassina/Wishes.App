import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { countryCode, notes, visitedAt, tag } = body;

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Missing countryCode' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', 'locations', 'web_locations.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const countries = JSON.parse(fileContents);

    const countryIndex = countries.findIndex((c: { code: string }) => c.code === countryCode);
    if (countryIndex === -1) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    if (notes !== undefined) countries[countryIndex].notes = notes;
    if (visitedAt !== undefined) countries[countryIndex].visitedAt = visitedAt;
    if (tag !== undefined) countries[countryIndex].tag = tag;

    await fs.writeFile(filePath, JSON.stringify(countries, null, 4), 'utf8');

    return NextResponse.json({
      success: true,
      message: 'Notes updated',
      country: countries[countryIndex],
    });
  } catch (error) {
    console.error('Error updating country notes:', error);
    return NextResponse.json(
      { error: 'Failed to update notes' },
      { status: 500 }
    );
  }
}
