const BACKEND_URL = 'https://what-we-watch-six.vercel.app/api/share-trailer';

document.getElementById('sendBtn').addEventListener('click', async () => {
  const btn = document.getElementById('sendBtn');
  const status = document.getElementById('status');

  btn.disabled = true;
  status.textContent = 'Sending...';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tab.title, url: tab.url })
    });

    const data = await res.json();

    if (data.ok) {
      status.textContent = '✅ Sent!';
    } else {
      status.textContent = '❌ Error: ' + (data.error || 'Unknown');
    }
  } catch (e) {
    status.textContent = '❌ Network error';
  }

  btn.disabled = false;
});
