import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename, getUserLocationsFilePath } from '@/lib/user-locations';
import { type Country, isCountryStatus, getPlaceKind } from '@/types/country';
import { enforceSameOrigin, enforceWriteRateLimit } from '@/lib/rate-limit';
import { normalizeCountryCode, normalizePlaceName } from '@/lib/place-validation';

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const originBlock = enforceSameOrigin(request);
    if (originBlock) return originBlock;

    const userKey = getUserLocationsFilename(session.user);
    const limited = enforceWriteRateLimit(userKey);
    if (limited) return limited;

    const body = await request.json();
    const countryCode = normalizeCountryCode(body.countryCode);
    const countryName = normalizePlaceName(body.countryName);
    const { newStatus } = body;

    if (!countryCode || !countryName || !newStatus) {
      return NextResponse.json(
        { error: 'Missing or invalid countryCode, countryName or newStatus' },
        { status: 400 }
      );
    }

    if (!isCountryStatus(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: done, in review, or pending' },
        { status: 400 }
      );
    }

    const filePath = getUserLocationsFilePath(userKey);

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

    if (newStatus === 'done' && getPlaceKind(countries[countryIndex]) === 'city') {
      const countryIdx = countries.findIndex(
        (c) => c.code === countryCode && getPlaceKind(c) === 'country'
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
