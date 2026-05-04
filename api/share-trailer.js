const { cleanTitle, cleanRussianTitle, isCyrillic } = require('../shared/cleanTitle');

const OMDB_KEY = process.env.OMDB_API_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID;
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function genresToHashtags(genres) {
  if (!genres || !genres.length) return '';
  return genres.map(g => '#' + g.name.toLowerCase().replace(/\s+/g, '_')).join(' ');
}

function genreStringToHashtags(genreStr) {
  if (!genreStr) return '';
  return genreStr.split(',').map(g => '#' + g.trim().toLowerCase().replace(/\s+/g, '_')).join(' ');
}

function extractYear(raw) {
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
}

// Get full movie details from TMDB by id
async function getTMDBDetails(id) {
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=en-US&append_to_response=release_dates`;
  const res = await fetch(url);
  return await res.json();
}

// Search TMDB, return first result full object
async function searchTMDB(query, year) {
  let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
  if (year) url += `&year=${year}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    return await getTMDBDetails(data.results[0].id);
  }
  return null;
}

async function fetchFromOMDb(movieTitle, year) {
  let url = `https://www.omdbapi.com/?t=${encodeURIComponent(movieTitle)}&apikey=${OMDB_KEY}`;
  if (year) url += `&y=${year}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.Response === 'False' && year) {
    const res2 = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(movieTitle)}&apikey=${OMDB_KEY}`);
    return await res2.json();
  }
  return data;
}

// Build unified movie object from TMDB details
function movieFromTMDB(t) {
  const year = t.release_date ? t.release_date.slice(0, 4) : 'N/A';
  const poster = t.poster_path ? TMDB_IMG + t.poster_path : null;
  const genres = t.genres ? t.genres.map(g => g.name).join(', ') : '';
  return {
    Response: 'True',
    Title: t.original_title || t.title,
    Year: year,
    Genre: genres,
    Poster: poster,
    imdbRating: t.vote_average ? t.vote_average.toFixed(1) : 'N/A',
    Ratings: [],
    _source: 'tmdb'
  };
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
    // Russian: use TMDB as primary (with year for precision)
    const ruClean = cleanRussianTitle(title);
    const tmdbMovie = await searchTMDB(ruClean, year);
    if (tmdbMovie) {
      movie = movieFromTMDB(tmdbMovie);
      // Try to enrich with OMDb ratings
      const omdb = await fetchFromOMDb(movie.Title, year);
      if (omdb.Response === 'True') {
        movie.imdbRating = omdb.imdbRating;
        movie.Ratings = omdb.Ratings || [];
        if (omdb.Poster && omdb.Poster !== 'N/A') movie.Poster = omdb.Poster;
      }
    }
  } else {
    // English: try OMDb first, fallback to TMDB
    const enClean = cleanTitle(title);
    const omdb = await fetchFromOMDb(enClean, year);
    if (omdb.Response === 'True') {
      movie = omdb;
    } else {
      const tmdbMovie = await searchTMDB(enClean, year);
      if (tmdbMovie) movie = movieFromTMDB(tmdbMovie);
    }
  }

  if (movie.Response === 'False') {
    return res.status(404).json({ ok: false, error: 'Movie not found: ' + title });
  }

  const imdb = movie.imdbRating && movie.imdbRating !== 'N/A' ? `⭐ IMDb: ${movie.imdbRating}` : '';
  const rt = (movie.Ratings || []).find(r => r.Source === 'Rotten Tomatoes');
  const rtText = rt ? `🍅 RT: ${rt.Value}` : '';
  const hashtags = genreStringToHashtags(movie.Genre);

  const q = encodeURIComponent(movie.Title);
  const watchLinks = `\n\n🎬 <a href="https://hdrezka.me/search/?do=search&subaction=search&q=${q}">HDrezka</a>  |  <a href="https://kinogo-films.biz/search/${q}">Kinogo</a>`;

  const caption = [
    `<b>${movie.Title}</b> (${movie.Year})`,
    hashtags + ' #не_смотрели',
    [imdb, rtText].filter(Boolean).join('  '),
    watchLinks
  ].filter(Boolean).join('\n');

  const replyMarkup = {
    inline_keyboard: [[
      { text: '👁 Посмотрели', callback_data: 'watched' }
    ]]
  };

  const hasValidPoster = movie.Poster && movie.Poster !== 'N/A' && movie.Poster.startsWith('http');

  let tgMethod, tgBody;
  if (hasValidPoster) {
    tgMethod = 'sendPhoto';
    tgBody = {
      chat_id: TG_CHAT_ID,
      photo: movie.Poster,
      caption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
      ...(TG_THREAD_ID && { message_thread_id: Number(TG_THREAD_ID) })
    };
  } else {
    tgMethod = 'sendMessage';
    tgBody = {
      chat_id: TG_CHAT_ID,
      text: caption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
      ...(TG_THREAD_ID && { message_thread_id: Number(TG_THREAD_ID) })
    };
  }

  const tgRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${tgMethod}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tgBody)
  });

  const tgData = await tgRes.json();
  if (!tgData.ok) return res.status(500).json({ ok: false, error: tgData.description });

  return res.json({ ok: true });
}
