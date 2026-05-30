import type { CountryLocation } from '@/types/country';

export type ListTabFilterId = 'all' | 'done' | 'in review' | 'pending';
export type StatusFilterMap = Record<'done' | 'in review' | 'pending', boolean>;

export function statusFiltersForListTab(tab: ListTabFilterId): StatusFilterMap {
  if (tab === 'all') {
    return { done: true, 'in review': true, pending: true };
  }
  return {
    done: tab === 'done',
    'in review': tab === 'in review',
    pending: tab === 'pending',
  };
}

export function getStatusDisplayLabel(status: string): string {
  if (status === 'done') return 'Complete';
  if (status === 'in review') return 'Review';
  return 'To Do';
}

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

export function getListTabLabel(tab: ListTabFilterId): string {
  switch (tab) {
    case 'done':
      return 'Complete';
    case 'in review':
      return 'Review';
    case 'pending':
      return 'To Do';
    default:
      return 'All';
  }
}

export function getListSearchResultsAnnouncement(options: {
  query: string;
  resultCount: number;
  tabTotalCount: number;
  tab: ListTabFilterId;
}): string {
  const q = options.query.trim();
  const tab = getListTabLabel(options.tab);
  const { resultCount, tabTotalCount } = options;

  if (!q) {
    if (tabTotalCount === 0) {
      return `No countries in ${tab}.`;
    }
    if (tabTotalCount === 1) {
      return `Showing 1 country in ${tab}.`;
    }
    return `Showing ${tabTotalCount} countries in ${tab}.`;
  }

  if (resultCount === 0) {
    return `No countries match “${q}” in ${tab}. 0 of ${tabTotalCount}.`;
  }
  if (resultCount === 1) {
    return `1 country found for “${q}” in ${tab}. 1 of ${tabTotalCount}.`;
  }
  return `${resultCount} countries found for “${q}” in ${tab}. ${resultCount} of ${tabTotalCount}.`;
}

export function getEmptyStateCopy(options: {
  search?: string;
  tab?: ListTabFilterId;
}): { message: string; hint: string } {
  const q = options.search?.trim();
  if (q) {
    return {
      message: `No countries match “${q}”`,
      hint: 'Try a different search or add a new country.',
    };
  }
  switch (options.tab ?? 'all') {
    case 'done':
      return {
        message: 'No completed countries yet',
        hint: 'Mark countries as complete or add a new one.',
      };
    case 'in review':
      return {
        message: 'No countries in review yet',
        hint: 'Move countries to Review or add a new one.',
      };
    case 'pending':
      return {
        message: 'No countries to do yet',
        hint: 'Add a country to your bucket list.',
      };
    default:
      return {
        message: 'No countries yet',
        hint: 'Add your first country to start your travel bucket list.',
      };
  }
}
