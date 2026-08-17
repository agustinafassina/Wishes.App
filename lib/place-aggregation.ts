import type { Country, CountryLocation, CountryStatus } from '@/types/country';
import { getPlaceKind, isCity, isCountryPlace } from '@/types/country';

type PlaceLike = Pick<Country, 'code' | 'status' | 'kind'>;

export function placesForCountryCode(all: PlaceLike[], code: string): PlaceLike[] {
  const upper = code.toUpperCase();
  return all.filter((p) => (p.code || '').toUpperCase() === upper);
}

export function getDerivedCountryStatus(
  code: string,
  all: PlaceLike[]
): CountryStatus {
  const related = placesForCountryCode(all, code);
  if (related.some((p) => p.status === 'done')) return 'done';
  if (related.some((p) => p.status === 'in review')) return 'in review';
  const countryRow = related.find((p) => isCountryPlace(p));
  return countryRow?.status ?? 'pending';
}

export function getVisitedCountryCodes(all: PlaceLike[]): string[] {
  const codes = new Set(
    all.map((p) => (p.code || '').toUpperCase()).filter(Boolean)
  );
  return [...codes].filter((code) => getDerivedCountryStatus(code, all) === 'done');
}

export function getVisitedCountryCount(all: PlaceLike[]): number {
  return getVisitedCountryCodes(all).length;
}

export function filterBySection(
  locations: CountryLocation[],
  section: 'countries' | 'cities'
): CountryLocation[] {
  if (section === 'cities') return locations.filter(isCity);
  return locations.filter(isCountryPlace);
}

export function withDerivedCountryStatuses(
  locations: CountryLocation[]
): CountryLocation[] {
  return locations.map((loc) => {
    if (getPlaceKind(loc) === 'city') return loc;
    const derived = getDerivedCountryStatus(loc.code, locations);
    if (derived === loc.status) return loc;
    return { ...loc, status: derived };
  });
}
