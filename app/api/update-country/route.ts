import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename, getUserLocationsFilePath } from '@/lib/user-locations';
import { type Country, isCountryStatus, getPlaceKind } from '@/types/country';

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { countryCode, countryName, newStatus } = body;

    if (!countryCode || !countryName || !newStatus) {
      return NextResponse.json(
        { error: 'Missing countryCode, countryName or newStatus' },
        { status: 400 }
      );
    }

    if (!isCountryStatus(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: done, in review, or pending' },
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

    countries[countryIndex].status = newStatus;

    // Completing a city → sync matching country row to done
    if (newStatus === 'done' && getPlaceKind(countries[countryIndex]) === 'city') {
      const codeUpper = String(countryCode).toUpperCase();
      const countryIdx = countries.findIndex(
        (c) => c.code === codeUpper && getPlaceKind(c) === 'country'
      );
      if (countryIdx !== -1 && countries[countryIdx].status !== 'done') {
        countries[countryIdx].status = 'done';
      }
    }

    await fs.writeFile(filePath, JSON.stringify(countries, null, 4), 'utf8');

    return NextResponse.json({
      success: true,
      message: `Country ${countryCode} status updated to ${newStatus}`,
      country: countries[countryIndex]
    });

  } catch (error) {
    console.error('Error updating country:', error);
    return NextResponse.json(
      { error: 'Failed to update country status' },
      { status: 500 }
    );
  }
}
