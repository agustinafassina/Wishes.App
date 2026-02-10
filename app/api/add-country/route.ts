import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename } from '@/lib/user-locations';

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, latitude, longitude, flag, photos, status } = body;

    // Validate required fields
    if (!name || !code || latitude === undefined || longitude === undefined || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code, latitude, longitude, status' },
        { status: 400 }
      );
    }

    // Valid status values
    const validStatuses = ['done', 'in review', 'pending'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: done, in review, or pending' },
        { status: 400 }
      );
    }

    const filename = getUserLocationsFilename(session.user);
    const filePath = path.join(process.cwd(), 'public', 'locations', 'users', `${filename}.json`);

    let countries: any[];
    try {
      const fileContents = await fs.readFile(filePath, 'utf8');
      countries = JSON.parse(fileContents);
      if (!Array.isArray(countries)) countries = [];
    } catch {
      countries = [];
    }

    // Check if country code already exists
    const existingCountry = countries.find((country: any) => country.code === code.toUpperCase());
    if (existingCountry) {
      return NextResponse.json(
        { error: `Country with code ${code.toUpperCase()} already exists` },
        { status: 400 }
      );
    }

    // Create new country object
    const newCountry = {
      name: name,
      code: code.toUpperCase(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      flag: flag || `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
      photos: photos || [],
      status: status,
    };

    // Add the new country to the array
    countries.push(newCountry);

    // Write the updated data back to the file
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

