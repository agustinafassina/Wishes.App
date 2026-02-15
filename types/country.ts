/**
 * Shared types for country/location domain.
 * Used by API routes and frontend (Map, etc.).
 */

export const COUNTRY_STATUSES = ['done', 'in review', 'pending'] as const;
export type CountryStatus = (typeof COUNTRY_STATUSES)[number];

/** Shape stored in JSON (public/locations/users/*.json). */
export interface Country {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  status: CountryStatus;
  flag?: string;
  photos?: string[];
  notes?: string;
  visitedAt?: string;
  /** @deprecated use tags */
  tag?: string;
  tags?: string[];
}

/** Shape used in the app (map, list) with id and position for Google Maps. */
export interface CountryLocation extends Country {
  id: string;
  position: { lat: number; lng: number };
}

export function isCountryStatus(s: unknown): s is CountryStatus {
  return typeof s === 'string' && COUNTRY_STATUSES.includes(s as CountryStatus);
}
