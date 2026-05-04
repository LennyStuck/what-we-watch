function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function genreStringToHashtags(genreStr) {
  if (!genreStr) return '';
  return genreStr.split(',').map(g => '#' + g.trim().toLowerCase().replace(/\s+/g, '_')).join(' ');
}

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID;

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { title, year, genre, poster, imdbRating, rtRating } = req.body;
  if (!title) return res.status(400).json({ ok: false, error: 'No title' });

  const imdb = imdbRating ? `⭐ IMDb: ${imdbRating}` : '';
  const rtText = rtRating ? `🍅 RT: ${rtRating}` : '';
  const hashtags = genreStringToHashtags(genre);
  const q = encodeURIComponent(title);
  const watchLinks = `\n\n🎬 <a href="https://hdrezka.me/search/?do=search&subaction=search&q=${q}">HDrezka</a>  |  <a href="https://kinogo-films.biz/search/${q}">Kinogo</a>`;

  const caption = [
    `<b>${title}</b> (${year || '?'})`,
    hashtags ? hashtags + ' #не_смотрели' : '#не_смотрели',
    [imdb, rtText].filter(Boolean).join('  '),
    watchLinks
  ].filter(Boolean).join('\n');

  const replyMarkup = { inline_keyboard: [[{ text: '👁 Посмотрели', callback_data: 'watched' }]] };
  const hasValidPoster = poster && poster.startsWith('http');

  const tgMethod = hasValidPoster ? 'sendPhoto' : 'sendMessage';
  const tgBody = hasValidPoster
    ? { chat_id: TG_CHAT_ID, photo: poster, caption, parse_mode: 'HTML', reply_markup: replyMarkup, ...(TG_THREAD_ID && { message_thread_id: Number(TG_THREAD_ID) }) }
    : { chat_id: TG_CHAT_ID, text: caption, parse_mode: 'HTML', reply_markup: replyMarkup, ...(TG_THREAD_ID && { message_thread_id: Number(TG_THREAD_ID) }) };

  const tgRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${tgMethod}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tgBody)
  });

  const tgData = await tgRes.json();
  if (!tgData.ok) return res.status(500).json({ ok: false, error: tgData.description });
  return res.json({ ok: true });
}
