/**
 * Country-related constants. Use these instead of hardcoding strings.
 */
import { COUNTRY_STATUSES } from '@/types/country';

export { COUNTRY_STATUSES };

export const DEFAULT_FLAG_BASE = 'https://flagcdn.com/w40';
export function getDefaultFlagUrl(code: string): string {
  return `${DEFAULT_FLAG_BASE}/${code.toLowerCase()}.png`;
}
