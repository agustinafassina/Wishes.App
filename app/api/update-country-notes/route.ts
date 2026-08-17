import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename, getUserLocationsFilePath } from '@/lib/user-locations';
import { type Country } from '@/types/country';
import { enforceSameOrigin, enforceWriteRateLimit } from '@/lib/rate-limit';
import {
  normalizeCountryCode,
  normalizeNotes,
  normalizePlaceName,
  normalizeTags,
  normalizeVisitedAt,
  PLACE_LIMITS,
} from '@/lib/place-validation';

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

    if (!countryCode || !countryName) {
      return NextResponse.json(
        { error: 'Missing or invalid countryCode or countryName' },
        { status: 400 }
      );
    }

    const notes = normalizeNotes(body.notes);
    if (notes === null) {
      return NextResponse.json(
        { error: `Invalid notes (string, max ${PLACE_LIMITS.notesMax} chars)` },
        { status: 400 }
      );
    }

    const visitedAt = normalizeVisitedAt(body.visitedAt);
    if (visitedAt === null) {
      return NextResponse.json(
        { error: `Invalid visitedAt (string, max ${PLACE_LIMITS.visitedAtMax} chars)` },
        { status: 400 }
      );
    }

    const tags = normalizeTags(body.tags);
    if (tags === null) {
      return NextResponse.json(
        {
          error: `Invalid tags (max ${PLACE_LIMITS.tagsMaxCount} tags, ${PLACE_LIMITS.tagMax} chars each)`,
        },
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

    if (notes !== undefined) countries[countryIndex].notes = notes;
    if (visitedAt !== undefined) countries[countryIndex].visitedAt = visitedAt;
    if (tags !== undefined) countries[countryIndex].tags = tags;

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
