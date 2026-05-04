/**
 * Detects if string contains Cyrillic characters.
 */
function isCyrillic(str) {
  return /[\u0400-\u04FF]/.test(str);
}

/**
 * Cleans an English YouTube title to extract a movie name.
 * Strategy: take only the part before the first | or — separator,
 * then strip noise words.
 */
function cleanTitle(raw) {
  // Take only the part before first pipe or em-dash — distributor/channel always comes after
  let title = raw.split(/[|\u2014\u2013]/)[0];

  return title
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/official\s*(trailer|teaser|clip|video)/gi, '')
    .replace(/\b(trailer|teaser|clip|featurette|sneak\s*peek)\b/gi, '')
    .replace(/\b(youtube|a24|marvel|disney|netflix|hbo|amazon|apple\s*tv|paramount|sony|universal|lionsgate|warner\s*bros?|20th\s*century\s*(studios?|fox)|utopia|neon|mubi)\b/gi, '')
    .replace(/\d{4}/g, '')
    .replace(/\b(4k|hd|uhd|subtitles?|sub|dubbed|dub|ru|eng)\b/gi, '')
    .replace(/[-:]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Cleans a Russian YouTube title — strips everything after dash/separator
 * since Russian titles are usually: "Название — Русский трейлер (год)"
 */
function cleanRussianTitle(raw) {
  const parts = raw.split(/[\u2013\u2014|]/);
  let title = parts[0];
  title = title.replace(/\(.*?\)/g, '');
  title = title.replace(/\b(трейлер|тизер|клип|официальный|русский|дублированный|субтитры)\b/gi, '');
  return title.replace(/\s{2,}/g, ' ').trim();
}

module.exports = { cleanTitle, cleanRussianTitle, isCyrillic };
