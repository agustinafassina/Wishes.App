import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename, getUserLocationsFilePath, ensureUserLocationsDir } from '@/lib/user-locations';
import { type Country, isCountryStatus, isPlaceKind, getPlaceKind } from '@/types/country';
import { getDefaultFlagUrl } from '@/constants/country';
import { enforceSameOrigin, enforceWriteRateLimit } from '@/lib/rate-limit';
import {
  normalizeCountryCode,
  normalizeOptionalHttpsUrl,
  normalizePhotoUrls,
  normalizePlaceName,
  parseLatitude,
  parseLongitude,
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
    const { name, code, latitude, longitude, flag, photos, status, kind: rawKind } = body;

    const nameTrim = normalizePlaceName(name);
    const codeUpper = normalizeCountryCode(code);
    const lat = parseLatitude(latitude);
    const lng = parseLongitude(longitude);

    if (!nameTrim || !codeUpper || lat === null || lng === null || !status) {
      return NextResponse.json(
        {
          error:
            'Invalid or missing fields: name (max 100), code (2 letters), latitude (-90..90), longitude (-180..180), status',
        },
        { status: 400 }
      );
    }

    if (!isCountryStatus(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: done, in review, or pending' },
        { status: 400 }
      );
    }

    const kind = rawKind === undefined || rawKind === null || rawKind === ''
      ? 'country'
      : isPlaceKind(rawKind)
        ? rawKind
        : null;

    if (kind === null) {
      return NextResponse.json(
        { error: 'Invalid kind. Must be: country or city' },
        { status: 400 }
      );
    }

    const flagUrl = normalizeOptionalHttpsUrl(flag);
    if (flagUrl === null) {
      return NextResponse.json(
        { error: 'Invalid flag URL. Must be https:// without credentials' },
        { status: 400 }
      );
    }

    const photoUrls = normalizePhotoUrls(photos);
    if (photoUrls === null) {
      return NextResponse.json(
        { error: 'Invalid photos. Use up to 10 https:// URLs' },
        { status: 400 }
      );
    }

    const filename = userKey;
    const filePath = getUserLocationsFilePath(filename);

    let countries: Country[];
    try {
      const fileContents = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(fileContents);
      countries = Array.isArray(parsed) ? parsed : [];
    } catch {
      countries = [];
    }

    const existingCountry = countries.find((c) => c.code === codeUpper && c.name === nameTrim);
    if (existingCountry) {
      const label = kind === 'city' ? 'city' : 'country';
      return NextResponse.json(
        { error: `A ${label} with code ${codeUpper} and this name already exists` },
        { status: 400 }
      );
    }

    const newCountry: Country = {
      name: nameTrim,
      code: codeUpper,
      latitude: lat,
      longitude: lng,
      flag: flagUrl ?? getDefaultFlagUrl(codeUpper),
      photos: photoUrls,
      status,
      ...(kind === 'city' ? { kind: 'city' as const } : {}),
    };

    countries.push(newCountry);

    if (kind === 'city' && status === 'done') {
      const countryIdx = countries.findIndex(
        (c) => c.code === codeUpper && getPlaceKind(c) === 'country'
      );
      if (countryIdx !== -1 && countries[countryIdx].status !== 'done') {
        countries[countryIdx].status = 'done';
      }
    }

    await ensureUserLocationsDir();
    await fs.writeFile(filePath, JSON.stringify(countries, null, 4), 'utf8');

    const placeLabel = kind === 'city' ? 'City' : 'Country';
    return NextResponse.json({
      success: true,
      message: `${placeLabel} ${nameTrim} added successfully`,
      country: newCountry
    });

  } catch (error) {
    console.error('Error adding country:', error);
    return NextResponse.json(
      { error: 'Failed to add country' },
      { status: 500 }
    );
  }
}
