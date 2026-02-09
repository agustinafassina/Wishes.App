import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { countryCode, countryName } = body;

    if (!countryCode || !countryName) {
      return NextResponse.json(
        { error: 'Missing countryCode or countryName' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', 'locations', 'web_locations.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const countries = JSON.parse(fileContents);

    const countryIndex = countries.findIndex((c: any) => c.code === countryCode && c.name === countryName);
    if (countryIndex === -1) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    const [removed] = countries.splice(countryIndex, 1);
    await fs.writeFile(filePath, JSON.stringify(countries, null, 4), 'utf8');

    return NextResponse.json({
      success: true,
      message: `Country ${removed.name} deleted`,
    });
  } catch (error) {
    console.error('Error deleting country:', error);
    return NextResponse.json(
      { error: 'Failed to delete country' },
      { status: 500 }
    );
  }
}
