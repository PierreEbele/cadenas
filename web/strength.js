/**
 * Estimation grossière de la solidité d'un mot de passe, pour guider
 * l'utilisateur (pas une garantie). Volontairement sans dépendance.
 */
const WEAK_PATTERNS = [
  '123456', 'password', 'motdepasse', 'azerty', 'qwerty', 'abcdef', 'soleil',
  'bonjour', 'admin', 'secret', 'iloveyou', 'loulou', 'doudou', '000000', '111111',
];

export const LEVELS = [
  { max: 35, label: 'Très faible', color: 'var(--weak)' },
  { max: 50, label: 'Faible', color: 'var(--weak)' },
  { max: 70, label: 'Correct', color: 'var(--fair)' },
  { max: 90, label: 'Fort', color: 'var(--good)' },
  { max: Infinity, label: 'Excellent', color: 'var(--strong)' },
];

/** Estime l'entropie en bits. */
export function entropyBits(password) {
  if (!password) return 0;
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33;

  const length = [...password].length;
  let bits = length * Math.log2(pool);

  // Peu de caractères distincts : "aaaaaaaa", "abababab"…
  const distinct = new Set(password.toLowerCase()).size;
  if (distinct <= 3) bits = Math.min(bits, distinct * 6);

  const lower = password.toLowerCase();
  if (WEAK_PATTERNS.some((pattern) => lower.includes(pattern))) bits *= 0.5;

  return bits;
}

/** Renvoie { bits, ratio (0..1), label, color }. */
export function assess(password) {
  const bits = entropyBits(password);
  const level = LEVELS.find((l) => bits < l.max);
  return { bits, ratio: Math.min(1, bits / 100), label: level.label, color: level.color };
}
