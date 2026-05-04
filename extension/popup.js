const BACKEND = 'https://what-we-watch-six.vercel.app';

const screenMain = document.getElementById('screen-main');
const screenEdit = document.getElementById('screen-edit');
const sendBtn    = document.getElementById('sendBtn');
const mainStatus = document.getElementById('main-status');
const titleInput = document.getElementById('titleInput');
const yearInput  = document.getElementById('yearInput');
const backBtn    = document.getElementById('backBtn');
const retryBtn   = document.getElementById('retryBtn');
const editStatus = document.getElementById('edit-status');

let currentTab = null;

// Grab current tab on open
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  currentTab = tab;
});

// ---- FAST SEND (Screen 1) ----
sendBtn.addEventListener('click', async () => {
  sendBtn.disabled = true;
  mainStatus.innerHTML = '🔍 Searching...';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  try {
    // Step 1: preview (find movie)
    const previewRes = await fetch(BACKEND + '/api/preview-trailer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tab.title, url: tab.url })
    });
    const preview = await previewRes.json();

    if (!preview.ok) {
      // Not found — switch to edit screen
      titleInput.value = preview.suggestedTitle || '';
      yearInput.value  = preview.suggestedYear  || '';
      showScreen('edit');
      return;
    }

    // Step 2: send immediately
    mainStatus.innerHTML = '📤 Sending...';
    const movie = preview.movie;
    const sent = await sendToTelegram(movie);

    if (sent.ok) {
      mainStatus.innerHTML = '<span class="status-ok">✅ Sent!</span>';
    } else {
      mainStatus.innerHTML = '<span class="status-err">❌ ' + (sent.error || 'Error') + '</span>';
      sendBtn.disabled = false;
    }
  } catch (e) {
    mainStatus.innerHTML = '<span class="status-err">❌ Network error</span>';
    sendBtn.disabled = false;
  }
});

// ---- BACK ----
backBtn.addEventListener('click', () => {
  sendBtn.disabled = false;
  mainStatus.innerHTML = '';
  editStatus.innerHTML = '';
  showScreen('main');
});

// ---- SEND ANYWAY (Screen 2) ----
retryBtn.addEventListener('click', async () => {
  retryBtn.disabled = true;
  editStatus.innerHTML = '📤 Sending...';

  const payload = {
    title: titleInput.value.trim(),
    year: yearInput.value.trim() || undefined
  };

  try {
    const sent = await sendToTelegram(payload);
    if (sent.ok) {
      editStatus.innerHTML = '<span class="status-ok">✅ Sent!</span>';
      retryBtn.textContent = '✅ Sent';
    } else {
      editStatus.innerHTML = '<span class="status-err">❌ ' + (sent.error || 'Error') + '</span>';
      retryBtn.disabled = false;
    }
  } catch (e) {
    editStatus.innerHTML = '<span class="status-err">❌ Network error</span>';
    retryBtn.disabled = false;
  }
});

// ---- Shared: send movie data to Telegram ----
async function sendToTelegram(movie) {
  const res = await fetch(BACKEND + '/api/share-trailer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(movie)
  });
  return await res.json();
}

function showScreen(name) {
  screenMain.style.display = name === 'main' ? 'block' : 'none';
  screenEdit.style.display = name === 'edit' ? 'block' : 'none';
}

showScreen('main');
