import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { countryCode, newStatus } = body;

    if (!countryCode || !newStatus) {
      return NextResponse.json(
        { error: 'Missing countryCode or newStatus' },
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

    // Path to the JSON file
    const filePath = path.join(process.cwd(), 'public', 'locations', 'web_locations.json');

    // Read the current JSON file
    const fileContents = await fs.readFile(filePath, 'utf8');
    const countries = JSON.parse(fileContents);

    // Find and update the country
    const countryIndex = countries.findIndex((country: any) => country.code === countryCode);
    
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

