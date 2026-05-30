"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Country, CountryLocation } from '@/types/country';
import { normalizeTags } from '@/components/map/utils';

const DEFAULT_SORT: Record<string, 'a-z' | 'z-a'> = {
  done: 'a-z',
  'in review': 'a-z',
  pending: 'a-z',
};

function mapApiToLocations(data: Country[]): CountryLocation[] {
  const list = Array.isArray(data) ? data : [];
  return list.map((country) => ({
    id: `${country.code}-${country.name}`,
    name: country.name,
    code: country.code,
    latitude: country.latitude,
    longitude: country.longitude,
    position: { lat: country.latitude, lng: country.longitude },
    photos: country.photos ?? [],
    status: country.status ?? 'pending',
    flag: country.flag ?? '',
    notes: country.notes,
    visitedAt: country.visitedAt,
    tags: normalizeTags(country),
  }));
}

function sortByName(list: CountryLocation[], order: 'a-z' | 'z-a'): CountryLocation[] {
  return [...list].sort((a, b) =>
    order === 'a-z'
      ? (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      : (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' })
  );
}

function reorderByColumnSort(
  list: CountryLocation[],
  sortState: Record<string, 'a-z' | 'z-a'>
): CountryLocation[] {
  const done = list.filter((l) => l.status === 'done');
  const inReview = list.filter((l) => l.status === 'in review');
  const pending = list.filter((l) => l.status === 'pending');
  return [
    ...sortByName(done, sortState.done ?? 'a-z'),
    ...sortByName(inReview, sortState['in review'] ?? 'a-z'),
    ...sortByName(pending, sortState.pending ?? 'a-z'),
  ];
}

export type GetColumnSort = () => Record<string, 'a-z' | 'z-a'>;

interface UseLocationsOptions {
  getColumnSort: GetColumnSort;
  onFirstLoad?: (position: { lat: number; lng: number }) => void;
}

export function useLocations({ getColumnSort, onFirstLoad }: UseLocationsOptions) {
  const [locations, setLocations] = useState<CountryLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const onFirstLoadRef = useRef(onFirstLoad);
  onFirstLoadRef.current = onFirstLoad;

  const refetchLocations = useCallback(async () => {
    const response = await fetch('/api/locations', { credentials: 'include' });
    const data = await (response.ok ? response.json() : Promise.resolve([]));
    const places = mapApiToLocations(Array.isArray(data) ? data : []);
    const sortState = getColumnSort();
    setLocations(reorderByColumnSort(places, sortState));
    return places;
  }, [getColumnSort]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingLocations(true);
    fetch('/api/locations', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.resolve([])))
      .then((data: Country[]) => {
        if (cancelled) return;
        const places = mapApiToLocations(Array.isArray(data) ? data : []);
        setLocations(reorderByColumnSort(places, DEFAULT_SORT));
        if (places.length > 0 && onFirstLoadRef.current) onFirstLoadRef.current(places[0].position);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Error loading countries:', err);
          setLocations([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLocations(false);
      });
    return () => { cancelled = true; };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { locations, setLocations, isLoadingLocations, refetchLocations, reorderByColumnSort };
}
