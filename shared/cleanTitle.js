/**
 * Cleans a YouTube video title to extract a movie name.
 */
function cleanTitle(raw) {
  return raw
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/official\s*(trailer|teaser|clip|video)/gi, '')
    .replace(/\b(trailer|teaser|clip|featurette|sneak\s*peek)\b/gi, '')
    .replace(/\b(youtube|a24|marvel|disney|netflix|hbo|amazon|apple\s*tv|paramount|sony|universal|lionsgate|warner\s*bros?|20th\s*century\s*(studios?|fox))\b/gi, '')
    .replace(/\d{4}/g, '')
    .replace(/\b(4k|hd|uhd|subtitles?|sub|dubbed|dub|ru|eng)\b/gi, '')
    .replace(/[-|\u2013\u2014:]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

module.exports = { cleanTitle };
