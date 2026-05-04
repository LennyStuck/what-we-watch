const { cleanTitleCandidates, cleanRussianTitleCandidates, isCyrillic } = require('../shared/cleanTitle');

const OMDB_KEY = process.env.OMDB_API_KEY;
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function extractYear(raw) {
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
}

async function getTMDBDetails(id) {
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=en-US&append_to_response=external_ids`;
  const res = await fetch(url);
  return await res.json();
}

async function searchTMDBCandidates(candidates, year) {
  for (const query of candidates) {
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
    if (year) url += `&year=${year}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.results && d.results.length > 0) return await getTMDBDetails(d.results[0].id);
    if (year) {
      const r2 = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
      const d2 = await r2.json();
      if (d2.results && d2.results.length > 0) return await getTMDBDetails(d2.results[0].id);
    }
  }
  return null;
}

async function fetchOMDbByImdbId(imdbId) {
  const r = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`);
  return await r.json();
}

async function fetchFromOMDbCandidates(candidates, year) {
  for (const query of candidates) {
    let url = `https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=${OMDB_KEY}`;
    if (year) url += `&y=${year}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.Response === 'True') return d;
    if (year) {
      const r2 = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=${OMDB_KEY}`);
      const d2 = await r2.json();
      if (d2.Response === 'True') return d2;
    }
  }
  return { Response: 'False' };
}

function movieFromTMDB(t) {
  return {
    Response: 'True',
    Title: t.original_title || t.title,
    Year: t.release_date ? t.release_date.slice(0, 4) : 'N/A',
    Genre: t.genres ? t.genres.map(g => g.name).join(', ') : '',
    Poster: t.poster_path ? TMDB_IMG + t.poster_path : null,
    imdbRating: 'N/A',
    Ratings: [],
    _imdbId: t.external_ids?.imdb_id || null
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
    const candidates = cleanRussianTitleCandidates(title);
    const t = await searchTMDBCandidates(candidates, year);
    if (t) {
      movie = movieFromTMDB(t);
      if (movie._imdbId) {
        const o = await fetchOMDbByImdbId(movie._imdbId);
        if (o.Response === 'True') {
          movie.imdbRating = o.imdbRating;
          movie.Ratings = o.Ratings || [];
          if (o.Poster && o.Poster !== 'N/A') movie.Poster = o.Poster;
        }
      }
    }
  } else {
    const candidates = cleanTitleCandidates(title);
    const o = await fetchFromOMDbCandidates(candidates, year);
    if (o.Response === 'True') {
      movie = o;
    } else {
      const t = await searchTMDBCandidates(candidates, year);
      if (t) {
        movie = movieFromTMDB(t);
        if (movie._imdbId) {
          const o2 = await fetchOMDbByImdbId(movie._imdbId);
          if (o2.Response === 'True') {
            movie.imdbRating = o2.imdbRating;
            movie.Ratings = o2.Ratings || [];
            if (o2.Poster && o2.Poster !== 'N/A') movie.Poster = o2.Poster;
          }
        }
      }
    }
  }

  const rt = (movie.Ratings || []).find(r => r.Source === 'Rotten Tomatoes');

  if (movie.Response === 'False') {
    const candidates = isCyrillic(title) ? cleanRussianTitleCandidates(title) : cleanTitleCandidates(title);
    return res.status(404).json({
      ok: false,
      error: 'not_found',
      suggestedTitle: candidates[0] || '',
      suggestedYear: year || ''
    });
  }

  return res.json({
    ok: true,
    movie: {
      title: movie.Title,
      year: movie.Year,
      genre: movie.Genre,
      poster: movie.Poster || null,
      imdbRating: movie.imdbRating !== 'N/A' ? movie.imdbRating : null,
      rtRating: rt ? rt.Value : null
    }
  });
}
