export const FAMILY_AURA_VALUES = [
  'happy',
  'relaxing',
  'traveling',
  'studying',
  'working',
  'watching_movies',
  'gaming',
] as const;

export type FamilyAuraValue = (typeof FAMILY_AURA_VALUES)[number];

export const FAMILY_AURA_LABELS: Record<FamilyAuraValue, string> = {
  happy: 'Happy',
  relaxing: 'Relaxing',
  traveling: 'Traveling',
  studying: 'Studying',
  working: 'Working',
  watching_movies: 'Watching Movies',
  gaming: 'Gaming',
};

export function isFamilyAura(value: unknown): value is FamilyAuraValue {
  return typeof value === 'string' && (FAMILY_AURA_VALUES as readonly string[]).includes(value);
}
