import path from 'path';
import { promises as fs } from 'fs';

const USER_LOCATIONS_DIR = path.join(process.cwd(), 'public', 'locations', 'users');

/**
 * Maps the logged-in user (from Auth0 session) to the filename of their locations JSON.
 * Convention: email → agustinafassina_gmail_com.json; nickname → agusfas_5.json.
 */
export function getUserLocationsFilename(user: {
  email?: string | null;
  nickname?: string | null;
  sub?: string | null;
}): string {
  const raw = (user?.email || user?.nickname || user?.sub || '').trim();
  if (!raw) return 'default';
  // Match existing files: email → agustinafassina_gmail_com (replace @ and . with _); nickname → agusfas_5
  const slug = raw
    .toLowerCase()
    .replace(/@/g, '_')
    .replace(/\./g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'default';
  return slug || 'default';
}

/**
 * Returns the full path to a user's locations JSON file.
 */
export function getUserLocationsFilePath(filename: string): string {
  return path.join(USER_LOCATIONS_DIR, `${filename}.json`);
}

/**
 * Ensures the user locations directory exists (for Docker volume or first run).
 * Call before writing so that an empty mounted volume works.
 */
export async function ensureUserLocationsDir(): Promise<void> {
  await fs.mkdir(USER_LOCATIONS_DIR, { recursive: true });
}
