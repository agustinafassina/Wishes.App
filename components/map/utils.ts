import type { CountryLocation } from '@/types/country';

export function normalizeTags(c: { tag?: string; tags?: string[] }): string[] {
  if (Array.isArray(c.tags) && c.tags.length > 0)
    return c.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '');
  if (typeof c.tag === 'string' && c.tag.trim() !== '') return [c.tag.trim()];
  return [];
}

export function matchesCountrySearch(location: CountryLocation, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tags = normalizeTags(location);
  const statusLabel =
    location.status === 'done'
      ? 'complete completed done visited'
      : location.status === 'in review'
        ? 'review in review'
        : 'pending to do todo';
  const haystack = [
    location.name,
    location.code,
    location.notes ?? '',
    location.visitedAt ?? '',
    location.status,
    statusLabel,
    location.tag ?? '',
    ...tags,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: 'done', label: 'Completed' },
  { id: 'in review', label: 'In Review' },
  { id: 'pending', label: 'Pending' },
];
