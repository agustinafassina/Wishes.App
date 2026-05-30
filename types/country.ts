

export const COUNTRY_STATUSES = ['done', 'in review', 'pending'] as const;
export type CountryStatus = (typeof COUNTRY_STATUSES)[number];

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

  tag?: string;
  tags?: string[];
}

export interface CountryLocation extends Country {
  id: string;
  position: { lat: number; lng: number };
}

export function isCountryStatus(s: unknown): s is CountryStatus {
  return typeof s === 'string' && COUNTRY_STATUSES.includes(s as CountryStatus);
}
