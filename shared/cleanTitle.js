/**
 * Detects if string contains Cyrillic characters.
 */
function isCyrillic(str) {
  return /[\u0400-\u04FF]/.test(str);
}

/**
 * Detects if string contains BOTH Cyrillic and Latin characters.
 */
function isBilingual(str) {
  return /[\u0400-\u04FF]/.test(str) && /[a-zA-Z]{3,}/.test(str);
}

/**
 * Try to extract English title from quotes/guillemets.
 * Handles: «The Beauty», "The Beauty", ‘The Beauty’, “The Beauty”
 * Returns null if not found or result contains Cyrillic.
 */
function extractQuotedTitle(raw) {
  const patterns = [
    /«([^\u00bb]+)\u00bb/,           // «text»
    /“([^\u201d]+)\u201d/,           // “text”
    /‘([^\u2019]+)\u2019/,           // ‘text’
    /"([^"]+)"/,                    // "text"
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) {
      const inner = m[1].trim();
      // Only return if Latin (no Cyrillic)
      if (!/[\u0400-\u04FF]/.test(inner) && /[a-zA-Z]{2,}/.test(inner)) {
        return inner;
      }
    }
  }
  return null;
}

/**
 * For bilingual titles: extract the Latin (English) portion by splitting on separators.
 */
function extractEnglishFromBilingual(raw) {
  const parts = raw.split(/[-\u2013\u2014|,]/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (/[\u0400-\u04FF]/.test(trimmed)) continue;
    if (/^[\s\d\(\)\[\]«»"']+$/.test(trimmed)) continue;
    if (/[a-zA-Z]{3,}/.test(trimmed)) return trimmed;
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
    .replace(/\b(trailer|teaser|clip|featurette|sneak\s*peek|exclusive|extended|final|red band|green band|international|season|episode|series|mini.?series)\b/gi, '')
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

  const add = (c) => { if (c && c.length > 1 && !candidates.includes(c)) candidates.push(c); };

  // Strategy 1: pipe separator
  const pipeParts = raw.split('|');
  if (pipeParts.length > 1) add(stripNoise(pipeParts[0]));

  // Strategy 2: em/en-dash separator
  const dashParts = raw.split(/[\u2013\u2014]/);
  if (dashParts.length > 1) add(stripNoise(dashParts[0]));

  // Strategy 3: colon separator
  const colonParts = raw.split(':');
  if (colonParts.length > 1) add(stripNoise(colonParts[0]));

  // Strategy 4: full string, replace separators with spaces
  add(stripNoise(raw.replace(/[-|:\u2013\u2014]/g, ' ')));

  // Strategy 5: full string, keep hyphens
  add(stripNoise(raw.replace(/[|:\u2013\u2014]/g, ' ')));

  return candidates;
}

function cleanTitle(raw) {
  return cleanTitleCandidates(raw)[0] || raw.trim();
}

/**
 * Returns candidates for Russian/bilingual titles.
 * Priority order:
 *   1. Quoted English title («The Beauty») <- new
 *   2. English part split by separators (bilingual)
 *   3. Russian part before separator
 *   4. Full string
 */
function cleanRussianTitleCandidates(raw) {
  const candidates = [];
  const add = (c) => { if (c && c.length > 1 && !candidates.includes(c)) candidates.push(c); };

  const noiseRu = (s) => s
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\b(трейлер|тизер|клип|официальный|русский|дублированный|дубляж|субтитры|сериал|сезон|эпизод)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Priority 1: English title in quotes/guillemets
  const quoted = extractQuotedTitle(raw);
  if (quoted) add(stripNoise(quoted));

  // Priority 2: bilingual — extract Latin segment
  if (isBilingual(raw)) {
    const enPart = extractEnglishFromBilingual(raw);
    if (enPart) add(stripNoise(enPart));
  }

  // Priority 3: Russian part before separator
  const parts = raw.split(/[\u2013\u2014|]/);
  add(noiseRu(parts[0]));

  // Priority 4: full string
  add(noiseRu(raw.replace(/[\u2013\u2014|]/g, ' ')));

  return candidates;
}

function cleanRussianTitle(raw) {
  return cleanRussianTitleCandidates(raw)[0] || raw.trim();
}

module.exports = { cleanTitle, cleanTitleCandidates, cleanRussianTitle, cleanRussianTitleCandidates, isCyrillic, isBilingual };
