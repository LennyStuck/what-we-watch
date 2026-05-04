# 🍿 What We Watch

A Chrome extension + Vercel serverless backend that sends movie info to a Telegram channel with one click while watching a trailer on YouTube.

## What it does

1. Open a movie trailer on YouTube
2. Click the extension button
3. Backend cleans the title, fetches poster + ratings from OMDb
4. Telegram bot posts the movie card to your family channel

## Stack

- **Chrome Extension** (Manifest V3)
- **Vercel Serverless Function** (Node.js)
- **OMDb API** — poster, IMDb rating, Rotten Tomatoes
- **Telegram Bot API** — sendPhoto with caption

## Setup

### 1. Get API keys
- **OMDb**: [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) — free (1000 req/day)
- **Telegram bot token**: [@BotFather](https://t.me/BotFather) → create bot → add as channel admin
- **Chat ID**: your channel ID (e.g. `-1001234567890`)
- **Thread ID** *(optional)*: topic ID if channel uses topics

### 2. Deploy to Vercel
1. Import repo at [vercel.com/new](https://vercel.com/new)
2. Add env variables from `.env.example`
3. Copy your deployment URL

### 3. Set backend URL in extension
In `extension/popup.js` replace `BACKEND_URL` with your Vercel URL.

### 4. Load extension in Chrome
1. `chrome://extensions/` → enable **Developer mode**
2. **Load unpacked** → select `extension/` folder

## Environment variables

| Variable | Description |
|---|---|
| `OMDB_API_KEY` | OMDb API key |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Target channel/chat ID |
| `TELEGRAM_THREAD_ID` | Topic thread ID (optional) |

## License
MIT
