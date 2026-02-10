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
    const { countryCode, countryName } = body;

    if (!countryCode || !countryName) {
      return NextResponse.json(
        { error: 'Missing countryCode or countryName' },
        { status: 400 }
      );
    }

    const filename = getUserLocationsFilename(session.user);
    const filePath = path.join(process.cwd(), 'public', 'locations', 'users', `${filename}.json`);

    let fileContents: string;
    try {
      fileContents = await fs.readFile(filePath, 'utf8');
    } catch {
      return NextResponse.json({ error: 'User locations file not found' }, { status: 404 });
    }
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
