const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const update = req.body;

  // Handle inline button callback
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message.chat.id;
    const messageId = cb.message.message_id;
    const currentCaption = cb.message.caption || '';

    if (cb.data === 'watched') {
      // Replace #не_смотрели with #посмотрели
      const newCaption = currentCaption.replace('#не_смотрели', '#посмотрели');

      // Edit caption
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: newCaption,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [] } // remove button
        })
      });

      // Answer callback to remove loading spinner
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: cb.id,
          text: '✅ Отмечено как посмотренное!'
        })
      });
    }
  }

  return res.status(200).json({ ok: true });
}
