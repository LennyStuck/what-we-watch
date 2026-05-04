const { cleanTitle, cleanRussianTitle, isCyrillic } = require('../shared/cleanTitle');

const OMDB_KEY = process.env.OMDB_API_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID;
const TMDB_KEY = process.env.TMDB_API_KEY;

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function genresToHashtags(genreStr) {
  if (!genreStr) return '';
  return genreStr
    .split(',')
    .map(g => '#' + g.trim().toLowerCase().replace(/\s+/g, '_'))
    .join(' ');
}

// Extract 4-digit year (1900-2099) from raw YouTube title
function extractYear(raw) {
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
}

async function findOnTMDB(query, year) {
  let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=ru-RU`;
  if (year) url += `&year=${year}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    return data.results[0].original_title;
  }
  return null;
}

async function fetchFromOMDb(movieTitle, year) {
  let url = `https://www.omdbapi.com/?t=${encodeURIComponent(movieTitle)}&apikey=${OMDB_KEY}`;
  if (year) url += `&y=${year}`;
  const res = await fetch(url);
  const data = await res.json();
  // If not found with year, retry without year
  if (data.Response === 'False' && year) {
    const res2 = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(movieTitle)}&apikey=${OMDB_KEY}`);
    return await res2.json();
  }
  return data;
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { title } = req.body;
  if (!title) return res.status(400).json({ ok: false, error: 'No title' });

  const year = extractYear(title);
  let movie = { Response: 'False' };

  if (isCyrillic(title)) {
    const ruClean = cleanRussianTitle(title);
    const originalTitle = await findOnTMDB(ruClean, year);
    if (originalTitle) {
      movie = await fetchFromOMDb(originalTitle, year);
    }
  } else {
    const enClean = cleanTitle(title);
    movie = await fetchFromOMDb(enClean, year);

    if (movie.Response === 'False' && TMDB_KEY) {
      const originalTitle = await findOnTMDB(enClean, year);
      if (originalTitle) {
        movie = await fetchFromOMDb(originalTitle, year);
      }
    }
  }

  if (movie.Response === 'False') {
    return res.status(404).json({ ok: false, error: 'Movie not found: ' + title });
  }

  const imdb = movie.imdbRating !== 'N/A' ? `⭐ IMDb: ${movie.imdbRating}` : '';
  const rt = movie.Ratings?.find(r => r.Source === 'Rotten Tomatoes');
  const rtText = rt ? `🍅 RT: ${rt.Value}` : '';
  const hashtags = genresToHashtags(movie.Genre);

  const q = encodeURIComponent(movie.Title);
  const watchLinks = `\n\n🎬 <a href="https://hdrezka.me/search/?do=search&subaction=search&q=${q}">HDrezka</a>  |  <a href="https://kinogo-films.biz/search/${q}">Kinogo</a>`;

  const caption = [
    `<b>${movie.Title}</b> (${movie.Year})`,
    hashtags + ' #не_смотрели',
    [imdb, rtText].filter(Boolean).join('  '),
    watchLinks
  ].filter(Boolean).join('\n');

  const tgBody = {
    chat_id: TG_CHAT_ID,
    photo: movie.Poster,
    caption,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '👁 Посмотрели', callback_data: 'watched' }
      ]]
    },
    ...(TG_THREAD_ID && { message_thread_id: Number(TG_THREAD_ID) })
  };

  const tgRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tgBody)
  });

  const tgData = await tgRes.json();

  if (!tgData.ok) {
    return res.status(500).json({ ok: false, error: tgData.description });
  }

  return res.json({ ok: true });
}
