/**
 * Cleans a YouTube video title to extract a movie name.
 */
function cleanTitle(raw) {
  return raw
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/official\s*(trailer|teaser|clip|video)/gi, '')
    .replace(/\d{4}/g, '')
    .replace(/4k|hd|uhd/gi, '')
    .replace(/[-|–—]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

module.exports = { cleanTitle };
