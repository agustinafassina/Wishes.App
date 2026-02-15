/**
 * Shared helpers for map/list components.
 */

export function normalizeTags(c: { tag?: string; tags?: string[] }): string[] {
  if (Array.isArray(c.tags) && c.tags.length > 0)
    return c.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '');
  if (typeof c.tag === 'string' && c.tag.trim() !== '') return [c.tag.trim()];
  return [];
}

export const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: 'done', label: 'Completed' },
  { id: 'in review', label: 'In Review' },
  { id: 'pending', label: 'Pending' },
];
