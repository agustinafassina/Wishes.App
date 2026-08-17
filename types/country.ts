export const COUNTRY_STATUSES = ['done', 'in review', 'pending'] as const;
export type CountryStatus = (typeof COUNTRY_STATUSES)[number];

export const PLACE_KINDS = ['country', 'city'] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export type TravelSection = 'countries' | 'cities';

export interface Country {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  status: CountryStatus;
  kind?: PlaceKind;
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

export function isPlaceKind(s: unknown): s is PlaceKind {
  return typeof s === 'string' && PLACE_KINDS.includes(s as PlaceKind);
}

export function getPlaceKind(place: Pick<Country, 'kind'>): PlaceKind {
  return place.kind === 'city' ? 'city' : 'country';
}

export function isCity(place: Pick<Country, 'kind'>): boolean {
  return getPlaceKind(place) === 'city';
}

export function isCountryPlace(place: Pick<Country, 'kind'>): boolean {
  return getPlaceKind(place) === 'country';
}
