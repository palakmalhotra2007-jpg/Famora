export const FAMILY_AURAS = [
  { id: 'happy', emoji: '😊', label: 'Happy', tint: '#FEF3C7', accent: '#D97706', ring: ['#F59E0B', '#FBBF24'] as const },
  { id: 'relaxing', emoji: '☕', label: 'Relaxing', tint: '#F5F5F4', accent: '#78716C', ring: ['#78716C', '#A8A29E'] as const },
  { id: 'traveling', emoji: '🏖', label: 'Traveling', tint: '#CCFBF1', accent: '#0F766E', ring: ['#0D9488', '#14B8A6'] as const },
  { id: 'studying', emoji: '📚', label: 'Studying', tint: '#EDE9FE', accent: '#6D28D9', ring: ['#7C3AED', '#8B5CF6'] as const },
  { id: 'working', emoji: '💻', label: 'Working', tint: '#DBEAFE', accent: '#1D4ED8', ring: ['#2563EB', '#3B82F6'] as const },
  { id: 'watching_movies', emoji: '🍿', label: 'Movies', tint: '#FCE7F3', accent: '#BE185D', ring: ['#DB2777', '#EC4899'] as const },
  { id: 'gaming', emoji: '🎮', label: 'Gaming', tint: '#FFEDD5', accent: '#C2410C', ring: ['#EA580C', '#F97316'] as const },
] as const;

export type FamilyAuraId = (typeof FAMILY_AURAS)[number]['id'];

export type AuraMeta = (typeof FAMILY_AURAS)[number];

const auraMap = new Map<string, AuraMeta>(FAMILY_AURAS.map((a) => [a.id, a]));

export function getAuraMeta(aura?: FamilyAuraId | null): AuraMeta | null {
  if (!aura) return null;
  return auraMap.get(aura) ?? null;
}

export function getAuraDisplay(aura?: FamilyAuraId | null): { emoji: string; label: string } | null {
  const meta = getAuraMeta(aura);
  return meta ? { emoji: meta.emoji, label: meta.label } : null;
}

export function formatAura(aura?: FamilyAuraId | null): string | null {
  const display = getAuraDisplay(aura);
  return display ? `${display.emoji} ${display.label}` : null;
}

export function getAuraRing(aura?: FamilyAuraId | null): readonly [string, string] {
  return getAuraMeta(aura)?.ring ?? (['#1E3A8A', '#2563EB'] as const);
}
