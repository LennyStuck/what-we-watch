/**
 * Detects if string contains Cyrillic characters.
 */
function isCyrillic(str) {
  return /[\u0400-\u04FF]/.test(str);
}

/**
 * Strip noise words from a candidate string.
 */
function stripNoise(s) {
  return s
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/official\s*(trailer|teaser|clip|video)/gi, '')
    .replace(/\b(trailer|teaser|clip|featurette|sneak\s*peek|exclusive|extended|final|red band|green band|international)\b/gi, '')
    .replace(/\b(youtube|a24|marvel|disney|netflix|hbo|amazon|apple\s*tv|paramount|sony|universal|lionsgate|warner\s*bros?|20th\s*century\s*(studios?|fox)|utopia|neon|mubi|searchlight|focus\s*features|altitude)\b/gi, '')
    .replace(/\d{4}/g, '')
    .replace(/\b(4k|hd|uhd|subtitles?|sub|dubbed|dub|ru|eng)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Returns an ordered array of title candidates for English titles.
 * Tries progressively more inclusive strategies.
 * The caller should try each candidate until a match is found.
 */
function cleanTitleCandidates(raw) {
  const candidates = [];

  // Strategy 1: take segment before first pipe (distributor separator)
  const pipeParts = raw.split('|');
  if (pipeParts.length > 1) {
    const c = stripNoise(pipeParts[0]);
    if (c.length > 1) candidates.push(c);
  }

  // Strategy 2: take segment before first em-dash or en-dash
  const dashParts = raw.split(/[\u2013\u2014]/);
  if (dashParts.length > 1) {
    const c = stripNoise(dashParts[0]);
    if (c.length > 1 && !candidates.includes(c)) candidates.push(c);
  }

  // Strategy 3: take segment before first colon (e.g. "Movie: Subtitle")
  const colonParts = raw.split(':');
  if (colonParts.length > 1) {
    const c = stripNoise(colonParts[0]);
    if (c.length > 1 && !candidates.includes(c)) candidates.push(c);
  }

  // Strategy 4: full string stripped of noise (replace hyphens with space)
  const full = stripNoise(raw.replace(/[-|:\u2013\u2014]/g, ' '));
  if (full.length > 1 && !candidates.includes(full)) candidates.push(full);

  // Strategy 5: full string stripped, keep hyphens (for hyphenated titles like "Spider-Man")
  const fullHyphen = stripNoise(raw.replace(/[|:\u2013\u2014]/g, ' '));
  if (fullHyphen.length > 1 && !candidates.includes(fullHyphen)) candidates.push(fullHyphen);

  return candidates;
}

/**
 * Legacy single-value wrapper (used as fallback).
 */
function cleanTitle(raw) {
  return cleanTitleCandidates(raw)[0] || raw.trim();
}

/**
 * Cleans a Russian YouTube title — strips everything after dash/separator.
 * Returns array of candidates like cleanTitleCandidates.
 */
function cleanRussianTitleCandidates(raw) {
  const candidates = [];

  const noiseRu = (s) => s
    .replace(/\(.*?\)/g, '')
    .replace(/\b(трейлер|тизер|клип|официальный|русский|дублированный|дубляж|субтитры)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Strategy 1: before first em/en-dash or pipe
  const parts = raw.split(/[\u2013\u2014|]/);
  const c1 = noiseRu(parts[0]);
  if (c1.length > 1) candidates.push(c1);

  // Strategy 2: full string stripped
  const full = noiseRu(raw.replace(/[\u2013\u2014|]/g, ' '));
  if (full.length > 1 && !candidates.includes(full)) candidates.push(full);

  return candidates;
}

function cleanRussianTitle(raw) {
  return cleanRussianTitleCandidates(raw)[0] || raw.trim();
}

module.exports = { cleanTitle, cleanTitleCandidates, cleanRussianTitle, cleanRussianTitleCandidates, isCyrillic };
