import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename, getUserLocationsFilePath } from '@/lib/user-locations';

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

    // Valid status values
    const validStatuses = ['done', 'in review', 'pending'];
    if (!validStatuses.includes(newStatus)) {
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
    const countries = JSON.parse(fileContents);

    // Find and update the country (code + name to support e.g. England vs Scotland both GB)
    const countryIndex = countries.findIndex((country: any) => country.code === countryCode && country.name === countryName);
    
    if (countryIndex === -1) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    // Update the status
    countries[countryIndex].status = newStatus;

    // Write the updated data back to the file
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

