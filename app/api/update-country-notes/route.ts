import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename, getUserLocationsFilePath } from '@/lib/user-locations';
import { type Country } from '@/types/country';

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { countryCode, countryName, notes, visitedAt, tags } = body;

    if (!countryCode || !countryName) {
      return NextResponse.json(
        { error: 'Missing countryCode or countryName' },
        { status: 400 }
      );
    }

    const filename = getUserLocationsFilename(session.user);
    const filePath = getUserLocationsFilePath(filename);

    let fileContents: string;
    try {
      fileContents = await fs.readFile(filePath, 'utf8');
    } catch {
      return NextResponse.json({ error: 'User locations file not found' }, { status: 404 });
    }
    const countries: Country[] = JSON.parse(fileContents);

    const countryIndex = countries.findIndex((c) => c.code === countryCode && c.name === countryName);
    if (countryIndex === -1) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    if (notes !== undefined) countries[countryIndex].notes = notes;
    if (visitedAt !== undefined) countries[countryIndex].visitedAt = visitedAt;
    if (tags !== undefined) {
      const arr = Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string' && t.trim() !== '') : [];
      countries[countryIndex].tags = arr.map((t: string) => t.trim());
    }

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
