
function beforeAt(value: string): string {
  const s = value.trim();
  return s.includes('@') ? s.split('@')[0].trim() : s;
}

export function getDisplayName(user: {
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  nickname?: string | null;
  email?: string | null;
}): string {
  const parts = [user.given_name, user.family_name].filter(Boolean) as string[];
  if (parts.length) return parts.join(' ');
  if (user.name?.trim()) return beforeAt(user.name);
  if (user.nickname?.trim()) return beforeAt(user.nickname);
  if (user.email?.trim() && user.email!.includes('@')) return beforeAt(user.email!);
  return 'User';
}
