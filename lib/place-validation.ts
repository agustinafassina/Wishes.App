export const PLACE_LIMITS = {
  nameMax: 100,
  codeLen: 2,
  notesMax: 5000,
  visitedAtMax: 50,
  tagMax: 40,
  tagsMaxCount: 20,
  photosMaxCount: 10,
  urlMax: 2048,
} as const;

export function parseLatitude(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
  if (!Number.isFinite(n) || n < -90 || n > 90) return null;
  return n;
}

export function parseLongitude(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
  if (!Number.isFinite(n) || n < -180 || n > 180) return null;
  return n;
}

export function normalizePlaceName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (!name || name.length > PLACE_LIMITS.nameMax) return null;
  return name;
}

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

export function isAllowedHttpsUrl(value: string): boolean {
  if (!value || value.length > PLACE_LIMITS.urlMax) return false;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizeOptionalHttpsUrl(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return isAllowedHttpsUrl(trimmed) ? trimmed : null;
}

export function normalizePhotoUrls(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > PLACE_LIMITS.photosMaxCount) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (!isAllowedHttpsUrl(trimmed)) return null;
    out.push(trimmed);
  }
  return out;
}

export function normalizeNotes(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return '';
  if (typeof value !== 'string') return null;
  if (value.length > PLACE_LIMITS.notesMax) return null;
  return value;
}

export function normalizeVisitedAt(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > PLACE_LIMITS.visitedAtMax) return null;
  return trimmed;
}

export function normalizeTags(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > PLACE_LIMITS.tagsMaxCount) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const t = item.trim();
    if (!t) continue;
    if (t.length > PLACE_LIMITS.tagMax) return null;
    out.push(t);
  }
  return out;
}