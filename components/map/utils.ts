import type { CountryLocation } from '@/types/country';
import type { TravelSection } from '@/types/country';

export type ListTabFilterId = 'all' | 'done' | 'in review' | 'pending';
export type StatusFilterMap = Record<'done' | 'in review' | 'pending', boolean>;

/** User-facing status labels — use everywhere (stats, tabs, filters, cards, Move to). */
export const STATUS_LABEL = {
  done: 'Complete',
  'in review': 'Review',
  pending: 'To Do',
} as const;

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
  if (status === 'done') return STATUS_LABEL.done;
  if (status === 'in review') return STATUS_LABEL['in review'];
  return STATUS_LABEL.pending;
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
  { id: 'done', label: STATUS_LABEL.done },
  { id: 'in review', label: STATUS_LABEL['in review'] },
  { id: 'pending', label: STATUS_LABEL.pending },
];

export function getListTabLabel(tab: ListTabFilterId): string {
  switch (tab) {
    case 'done':
      return STATUS_LABEL.done;
    case 'in review':
      return STATUS_LABEL['in review'];
    case 'pending':
      return STATUS_LABEL.pending;
    default:
      return 'All';
  }
}

export function getListSearchResultsAnnouncement(options: {
  query: string;
  resultCount: number;
  tabTotalCount: number;
  tab: ListTabFilterId;
  section?: TravelSection;
}): string {
  const q = options.query.trim();
  const tab = getListTabLabel(options.tab);
  const { resultCount, tabTotalCount } = options;
  const noun = options.section === 'cities' ? 'cities' : 'countries';
  const nounOne = options.section === 'cities' ? 'city' : 'country';

  if (!q) {
    if (tabTotalCount === 0) {
      return `No ${noun} in ${tab}.`;
    }
    if (tabTotalCount === 1) {
      return `Showing 1 ${nounOne} in ${tab}.`;
    }
    return `Showing ${tabTotalCount} ${noun} in ${tab}.`;
  }

  if (resultCount === 0) {
    return `No ${noun} match “${q}” in ${tab}. 0 of ${tabTotalCount}.`;
  }
  if (resultCount === 1) {
    return `1 ${nounOne} found for “${q}” in ${tab}. 1 of ${tabTotalCount}.`;
  }
  return `${resultCount} ${noun} found for “${q}” in ${tab}. ${resultCount} of ${tabTotalCount}.`;
}

export function getFirstUseEmptyStateCopy(section: TravelSection = 'countries'): { message: string; hint: string } {
  if (section === 'cities') {
    return {
      message: 'Start your city list',
      hint: 'Add your first city to see it on the map.',
    };
  }
  return {
    message: 'Start your travel bucket list',
    hint: 'Add your first country to see it on the map.',
  };
}

export function getEmptyStateCopy(options: {
  search?: string;
  tab?: ListTabFilterId;
  section?: TravelSection;
}): { message: string; hint: string } {
  const section = options.section ?? 'countries';
  const isCities = section === 'cities';
  const noun = isCities ? 'cities' : 'countries';
  const nounOne = isCities ? 'city' : 'country';
  const addLabel = isCities ? 'city' : 'country';

  const q = options.search?.trim();
  if (q) {
    return {
      message: `No ${noun} match “${q}”`,
      hint: `Try a different search or add a new ${addLabel}.`,
    };
  }
  switch (options.tab ?? 'all') {
    case 'done':
      return {
        message: `No ${STATUS_LABEL.done} ${noun} yet`,
        hint: `Mark ${noun} as ${STATUS_LABEL.done.toLowerCase()} or add a new one.`,
      };
    case 'in review':
      return {
        message: `No ${STATUS_LABEL['in review']} ${noun} yet`,
        hint: `Move ${noun} to ${STATUS_LABEL['in review']} or add a new one.`,
      };
    case 'pending':
      return {
        message: `No ${STATUS_LABEL.pending} ${noun} yet`,
        hint: `Add a ${addLabel} to your bucket list.`,
      };
    default:
      return {
        message: `No ${noun} yet`,
        hint: `Add your first ${addLabel} to start your travel bucket list.`,
      };
  }
}
