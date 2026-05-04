const BACKEND = 'https://what-we-watch-six.vercel.app';

const screenMain = document.getElementById('screen-main');
const screenEdit = document.getElementById('screen-edit');
const sendBtn    = document.getElementById('sendBtn');
const mainStatus = document.getElementById('main-status');
const titleInput = document.getElementById('titleInput');
const yearInput  = document.getElementById('yearInput');
const editError  = document.getElementById('edit-error');
const retryBtn   = document.getElementById('retryBtn');
const editStatus = document.getElementById('edit-status');
const backBtn    = document.getElementById('backBtn');

// ── SCREEN 1: fast send ──────────────────────────────────────────
sendBtn.addEventListener('click', async () => {
  sendBtn.disabled = true;
  mainStatus.innerHTML = '🔍 Searching...';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const preview = await apiFetch('/api/preview-trailer', { title: tab.title, url: tab.url });

    if (!preview.ok) {
      // Not found → show edit screen, pre-fill with suggestions
      titleInput.value = preview.suggestedTitle || '';
      yearInput.value  = preview.suggestedYear  || '';
      editError.textContent = '⚠️ Movie not found — correct the title and try again';
      editStatus.innerHTML = '';
      showScreen('edit');
      return;
    }

    // Found → send immediately
    mainStatus.innerHTML = '📤 Sending...';
    await doSend(preview.movie);
    mainStatus.innerHTML = '<span class="ok">✅ Sent!</span>';
  } catch (e) {
    mainStatus.innerHTML = '<span class="err">❌ Network error</span>';
    sendBtn.disabled = false;
  }
});

// ── SCREEN 2: retry with manual input ───────────────────────────
retryBtn.addEventListener('click', async () => {
  retryBtn.disabled = true;
  editStatus.innerHTML = '🔍 Searching...';
  editError.textContent = '';

  const title = titleInput.value.trim();
  const year  = yearInput.value.trim();

  if (!title) {
    editStatus.innerHTML = '<span class="err">❌ Enter a title</span>';
    retryBtn.disabled = false;
    return;
  }

  try {
    // Search again with user-corrected title (append year so cleanTitle can extract it)
    const query = year ? `${title} (${year})` : title;
    const preview = await apiFetch('/api/preview-trailer', { title: query });

    if (!preview.ok) {
      // Still not found → stay on edit screen, show error
      editError.textContent = '⚠️ Still not found — try a different title';
      editStatus.innerHTML = '';
      retryBtn.disabled = false;
      return;
    }

    // Found → send
    editStatus.innerHTML = '📤 Sending...';
    await doSend(preview.movie);
    editStatus.innerHTML = '<span class="ok">✅ Sent!</span>';
    retryBtn.textContent = '✅ Sent';
  } catch (e) {
    editStatus.innerHTML = '<span class="err">❌ Network error</span>';
    retryBtn.disabled = false;
  }
});

backBtn.addEventListener('click', () => {
  sendBtn.disabled = false;
  mainStatus.innerHTML = '';
  showScreen('main');
});

// ── Helpers ──────────────────────────────────────────────────────
async function apiFetch(path, body) {
  const res = await fetch(BACKEND + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function doSend(movie) {
  const res = await apiFetch('/api/share-trailer', movie);
  if (!res.ok) throw new Error(res.error || 'Send failed');
}

function showScreen(name) {
  screenMain.style.display = name === 'main' ? 'block' : 'none';
  screenEdit.style.display = name === 'edit' ? 'block' : 'none';
}

showScreen('main');
