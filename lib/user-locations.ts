import path from 'path';
import { promises as fs } from 'fs';

const USER_LOCATIONS_DIR = path.join(process.cwd(), 'public', 'locations', 'users');


export function getUserLocationsFilename(user: {
  email?: string | null;
  nickname?: string | null;
  sub?: string | null;
}): string {
  const raw = (user?.email || user?.nickname || user?.sub || '').trim();
  if (!raw) return 'default';

  const slug = raw
    .toLowerCase()
    .replace(/@/g, '_')
    .replace(/\./g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'default';
  return slug || 'default';
}


export function getUserLocationsFilePath(filename: string): string {
  return path.join(USER_LOCATIONS_DIR, `${filename}.json`);
}


export async function ensureUserLocationsDir(): Promise<void> {
  await fs.mkdir(USER_LOCATIONS_DIR, { recursive: true });
}
