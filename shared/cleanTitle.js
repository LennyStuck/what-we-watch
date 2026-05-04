/**
 * Detects if string contains Cyrillic characters.
 */
function isCyrillic(str) {
  return /[\u0400-\u04FF]/.test(str);
}

/**
 * Detects if string contains BOTH Cyrillic and Latin characters.
 * Example: "Преступления будущего - Crimes of the Future (2022)"
 */
function isBilingual(str) {
  return /[\u0400-\u04FF]/.test(str) && /[a-zA-Z]{3,}/.test(str);
}

/**
 * For bilingual titles: extract the Latin (English) portion.
 * Splits on dash/pipe separators and picks the segment without Cyrillic.
 * Returns null if no clean Latin segment found.
 */
function extractEnglishFromBilingual(raw) {
  // Split on common separators
  const parts = raw.split(/[-\u2013\u2014|]/);
  for (const part of parts) {
    const trimmed = part.trim();
    // Skip if contains Cyrillic
    if (/[\u0400-\u04FF]/.test(trimmed)) continue;
    // Skip noise-only segments
    if (/^[\s\d\(\)\[\]]+$/.test(trimmed)) continue;
    // Must have at least 3 Latin letters
    if (/[a-zA-Z]{3,}/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
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
 */
function cleanTitleCandidates(raw) {
  const candidates = [];

  // Strategy 1: pipe separator
  const pipeParts = raw.split('|');
  if (pipeParts.length > 1) {
    const c = stripNoise(pipeParts[0]);
    if (c.length > 1) candidates.push(c);
  }

  // Strategy 2: em/en-dash separator
  const dashParts = raw.split(/[\u2013\u2014]/);
  if (dashParts.length > 1) {
    const c = stripNoise(dashParts[0]);
    if (c.length > 1 && !candidates.includes(c)) candidates.push(c);
  }

  // Strategy 3: colon separator
  const colonParts = raw.split(':');
  if (colonParts.length > 1) {
    const c = stripNoise(colonParts[0]);
    if (c.length > 1 && !candidates.includes(c)) candidates.push(c);
  }

  // Strategy 4: full string, hyphens replaced with spaces
  const full = stripNoise(raw.replace(/[-|:\u2013\u2014]/g, ' '));
  if (full.length > 1 && !candidates.includes(full)) candidates.push(full);

  // Strategy 5: full string, keep hyphens (Spider-Man etc)
  const fullHyphen = stripNoise(raw.replace(/[|:\u2013\u2014]/g, ' '));
  if (fullHyphen.length > 1 && !candidates.includes(fullHyphen)) candidates.push(fullHyphen);

  return candidates;
}

function cleanTitle(raw) {
  return cleanTitleCandidates(raw)[0] || raw.trim();
}

/**
 * Returns candidates for Russian/bilingual titles.
 * If bilingual: English part goes FIRST as highest priority candidate.
 */
function cleanRussianTitleCandidates(raw) {
  const candidates = [];

  const noiseRu = (s) => s
    .replace(/\(.*?\)/g, '')
    .replace(/\b(трейлер|тизер|клип|официальный|русский|дублированный|дубляж|субтитры)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Priority 0: if bilingual, extract English part first
  if (isBilingual(raw)) {
    const enPart = extractEnglishFromBilingual(raw);
    if (enPart) {
      const c = stripNoise(enPart);
      if (c.length > 1) candidates.push(c);
    }
  }

  // Strategy 1: before first em/en-dash or pipe (Russian part)
  const parts = raw.split(/[\u2013\u2014|]/);
  const c1 = noiseRu(parts[0]);
  if (c1.length > 1 && !candidates.includes(c1)) candidates.push(c1);

  // Strategy 2: full string stripped
  const full = noiseRu(raw.replace(/[\u2013\u2014|]/g, ' '));
  if (full.length > 1 && !candidates.includes(full)) candidates.push(full);

  return candidates;
}

function cleanRussianTitle(raw) {
  return cleanRussianTitleCandidates(raw)[0] || raw.trim();
}

module.exports = { cleanTitle, cleanTitleCandidates, cleanRussianTitle, cleanRussianTitleCandidates, isCyrillic, isBilingual };
