import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { auth0 } from '@/lib/auth0';
import { getUserLocationsFilename } from '@/lib/user-locations';

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filename = getUserLocationsFilename(session.user);
    const filePath = path.join(process.cwd(), 'public', 'locations', 'users', `${filename}.json`);

    let data: unknown[];
    try {
      const fileContents = await fs.readFile(filePath, 'utf8');
      data = JSON.parse(fileContents);
    } catch {
      // File not found or invalid JSON → return empty list
      data = [];
    }

    if (!Array.isArray(data)) {
      return NextResponse.json([]);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading user locations:', error);
    return NextResponse.json({ error: 'Failed to load locations' }, { status: 500 });
  }
}
