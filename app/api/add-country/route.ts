import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename, getUserLocationsFilePath, ensureUserLocationsDir } from '@/lib/user-locations';
import { type Country, isCountryStatus } from '@/types/country';
import { getDefaultFlagUrl } from '@/constants/country';

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, latitude, longitude, flag, photos, status } = body;

    if (!name || !code || latitude === undefined || longitude === undefined || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code, latitude, longitude, status' },
        { status: 400 }
      );
    }

    if (!isCountryStatus(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: done, in review, or pending' },
        { status: 400 }
      );
    }

    const filename = getUserLocationsFilename(session.user);
    const filePath = getUserLocationsFilePath(filename);

    let countries: Country[];
    try {
      const fileContents = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(fileContents);
      countries = Array.isArray(parsed) ? parsed : [];
    } catch {
      countries = [];
    }

    const codeUpper = code.toUpperCase();
    const existingCountry = countries.find((c) => c.code === codeUpper && c.name === (name as string).trim());
    if (existingCountry) {
      return NextResponse.json(
        { error: `A country with code ${codeUpper} and this name already exists` },
        { status: 400 }
      );
    }

    const newCountry: Country = {
      name: String(name).trim(),
      code: codeUpper,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      flag: flag && String(flag).trim() ? String(flag).trim() : getDefaultFlagUrl(code),
      photos: Array.isArray(photos) ? photos : [],
      status,
    };

    // Add the new country to the array
    countries.push(newCountry);

    // Ensure directory exists (e.g. when using Docker with an empty volume)
    await ensureUserLocationsDir();
    await fs.writeFile(filePath, JSON.stringify(countries, null, 4), 'utf8');

    return NextResponse.json({ 
      success: true, 
      message: `Country ${name} added successfully`,
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

