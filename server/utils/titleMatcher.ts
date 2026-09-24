/**
 * Strips out platform, store names, key types, and edition noise
 */
export function cleanTitleForMatching(raw: string): string {
  let s = raw.toLowerCase();

  // Remove text inside parenthesis or brackets like (PC), [Steam], (Xbox Series X|S)
  s = s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');

  // Remove console variations like Xbox Series X|S, PS5, etc. BEFORE Roman numerals!
  s = s.replace(/xbox\s*series\s*[xs|/ ]+/gi, ' ');
  s = s.replace(/\b(xbox\s*one|xbox|playstation\s*[45]?|ps[45]|nintendo\s*switch|switch|pc|mac|windows|microsoft\s*store)\b/gi, ' ');

  // Remove store and key terms
  s = s.replace(
    /\b(steam\s*cd\s*key|steam\s*key|gog\s*cd\s*key|cd\s*key|digital\s*key|altergift|global|europe|eu|row|emea|pre-order|preorder|code|key)\b/gi,
    ' '
  );

  // Remove common edition keywords
  s = s.replace(
    /\b(deluxe|standard|ultimate|definitive|goty|game of the year|collector'?s?|edition|remastered|director'?s? cut|early access)\b/gi,
    ' '
  );

  // Convert Roman numerals (II -> 2, III -> 3, IV -> 4, etc.)
  s = s
    .replace(/\bviii\b/gi, '8')
    .replace(/\bvii\b/gi, '7')
    .replace(/\bvi\b/gi, '6')
    .replace(/\biv\b/gi, '4')
    .replace(/\biii\b/gi, '3')
    .replace(/\bii\b/gi, '2')
    .replace(/\bv\b/gi, '5')
    .replace(/\bix\b/gi, '9')
    .replace(/\bx\b/gi, '10');

  // Replace symbols/punctuation with spaces, collapsing extra whitespace
  s = s.replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Returns true if the candidate title matches the target game title.
 * Prevents:
 * 1. Matching sequels (e.g. Hades vs Hades 2 / Hades II)
 * 2. Matching completely different games that contain words (e.g. Hades vs H.A.D.E.S. Zero)
 * 3. Matching compilation DLCs (e.g. Cyberpunk vs Model Builder DLC)
 */
export function isExactGameMatch(targetTitle: string, candidateTitle: string): boolean {
  const targetClean = cleanTitleForMatching(targetTitle);
  const candClean = cleanTitleForMatching(candidateTitle);

  if (!targetClean || !candClean) return false;

  // 1. Direct match
  if (targetClean === candClean) return true;

  const targetWords = targetClean.split(' ').filter(Boolean);
  const candWords = candClean.split(' ').filter(Boolean);

  // 2. Sequel number check: target and candidate MUST have the exact same sequence of digits
  const targetNumbers = targetWords.filter((w) => /^\d+$/.test(w));
  const candNumbers = candWords.filter((w) => /^\d+$/.test(w));

  if (targetNumbers.join(',') !== candNumbers.join(',')) {
    return false;
  }

  // 3. Every word in target must be present in candidate
  for (const tw of targetWords) {
    if (!candWords.includes(tw)) {
      return false;
    }
  }

  // 4. Candidate must not contain extra title words that differentiate games
  // Allowed extra words are only harmless metadata leftovers
  const harmlessTokens = new Set([
    'pc',
    'game',
    'edition',
    'key',
    'bundle',
    'digital',
    'dlc',
    'pack',
    'pass',
    'online',
  ]);

  const extraWords = candWords.filter((cw) => !targetWords.includes(cw));
  const nonHarmlessExtras = extraWords.filter((w) => !harmlessTokens.has(w));

  if (nonHarmlessExtras.length > 0) {
    return false;
  }

  return true;
}
