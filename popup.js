const splitBtn   = document.getElementById('splitBtn');
const restoreBtn  = document.getElementById('restoreBtn');
const status      = document.getElementById('status');
const badge       = document.getElementById('badge');
const badgeText   = document.getElementById('badgeText');

function setLoading(msg) {
  status.textContent = msg;
  splitBtn.disabled = restoreBtn.disabled = true;
}

function setError(msg) {
  status.textContent = msg;
  splitBtn.disabled = restoreBtn.disabled = false;
}

function setActive(isActive) {
  splitBtn.style.display   = isActive ? 'none'  : 'block';
  restoreBtn.style.display = isActive ? 'block' : 'none';
  badge.className = 'badge ' + (isActive ? 'active' : 'inactive');
  badgeText.textContent = isActive ? 'Split active' : 'Ready';
}

async function getCurrentTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function updateUI() {
  const tabId = await getCurrentTabId();
  const state = await chrome.runtime.sendMessage({ action: 'getState' });
  setActive(state.splitTabId === tabId);
}

splitBtn.addEventListener('click', async () => {
  setLoading('Injecting split view…');
  const tabId = await getCurrentTabId();
  if (!tabId) return setError('No active tab');
  const result = await chrome.runtime.sendMessage({ action: 'split', tabId });
  result?.error ? setError('Error: ' + result.error) : window.close();
});

restoreBtn.addEventListener('click', async () => {
  setLoading('Restoring…');
  const tabId = await getCurrentTabId();
  const result = await chrome.runtime.sendMessage({ action: 'restore', tabId });
  result?.error ? setError('Error: ' + result.error) : window.close();
});

updateUI();
