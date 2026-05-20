const AMAZON_APP_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
  'Mobile/21A329 AmazonApp/25.18.0.300 iOS/17.0';

const RULE_UA  = 2001;
const RULE_XFO = 2002;

async function enableSplit(tabId) {
  // Rule 1: inject mobile UA on all sub_frame requests from this tab
  // Rule 2: strip X-Frame-Options + CSP from sub_frame responses (unblock iframe)
  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id: RULE_UA,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [{ header: 'User-Agent', operation: 'set', value: AMAZON_APP_UA }]
        },
        condition: { tabIds: [tabId], resourceTypes: ['sub_frame'] }
      },
      {
        id: RULE_XFO,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'X-Frame-Options', operation: 'remove' },
            { header: 'Content-Security-Policy', operation: 'remove' }
          ]
        },
        condition: { tabIds: [tabId], resourceTypes: ['sub_frame'] }
      }
    ],
    removeRuleIds: []
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    func: injectSplitLayout
  });

  await chrome.storage.session.set({ splitTabId: tabId });
}

async function disableSplit(tabId) {
  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [],
    removeRuleIds: [RULE_UA, RULE_XFO]
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    func: removeSplitLayout
  });

  await chrome.storage.session.remove('splitTabId');
}

// Injected into the page — no closure refs allowed
function injectSplitLayout() {
  if (document.getElementById('amz-split-host')) return;

  const MOBILE_WIDTH = 393;
  const url = window.location.href;

  // Wrapper that fills the viewport
  const host = document.createElement('div');
  host.id = 'amz-split-host';
  host.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483647',
    'display:flex', 'background:#f0f0f0', 'gap:3px'
  ].join(';');

  // Left pane: desktop iframe
  const left = document.createElement('iframe');
  left.id = 'amz-split-desktop';
  left.src = url;
  left.style.cssText = 'flex:1; height:100%; border:none; background:#fff;';

  // Label bar
  function label(text, bg) {
    const bar = document.createElement('div');
    bar.textContent = text;
    bar.style.cssText = [
      `background:${bg}`, 'color:#111', 'font:700 11px/28px sans-serif',
      'text-align:center', 'letter-spacing:.5px', 'flex-shrink:0'
    ].join(';');
    return bar;
  }

  // Right pane wrapper
  const rightWrap = document.createElement('div');
  rightWrap.style.cssText = [
    `width:${MOBILE_WIDTH}px`, 'flex-shrink:0', 'display:flex',
    'flex-direction:column', 'height:100%'
  ].join(';');

  const rightLabel = label('📱  MOBILE · Amazon App UA', '#FF9900');
  rightLabel.style.flexShrink = '0';

  const right = document.createElement('iframe');
  right.id = 'amz-split-mobile';
  right.src = url;
  right.style.cssText = 'flex:1; border:none; background:#fff; width:100%;';

  rightWrap.appendChild(rightLabel);
  rightWrap.appendChild(right);

  // Left label bar on top of left pane
  const leftWrap = document.createElement('div');
  leftWrap.style.cssText = 'flex:1; display:flex; flex-direction:column; height:100%; min-width:0;';
  const leftLabel = label('🖥  DESKTOP', '#e0e0e0');
  leftLabel.style.flexShrink = '0';
  leftWrap.appendChild(leftLabel);
  leftWrap.appendChild(left);

  // Close button
  const close = document.createElement('button');
  close.textContent = '✕ Exit Split';
  close.style.cssText = [
    'position:absolute', 'top:4px', 'right:400px',
    'z-index:1', 'padding:3px 10px', 'border:none',
    'border-radius:4px', 'cursor:pointer', 'font:600 11px sans-serif',
    'background:#333', 'color:#fff', 'opacity:.85'
  ].join(';');
  close.onclick = () => chrome.runtime.sendMessage({ action: 'restore' });

  host.appendChild(leftWrap);
  host.appendChild(rightWrap);
  host.appendChild(close);
  document.body.appendChild(host);
  document.body.style.overflow = 'hidden';
}

function removeSplitLayout() {
  const host = document.getElementById('amz-split-host');
  if (host) host.remove();
  document.body.style.overflow = '';
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.action === 'split') {
      await enableSplit(msg.tabId);
      sendResponse({ success: true });
    } else if (msg.action === 'restore') {
      const tabId = msg.tabId ?? sender.tab?.id;
      if (tabId) await disableSplit(tabId);
      sendResponse({ success: true });
    } else if (msg.action === 'getState') {
      const data = await chrome.storage.session.get('splitTabId');
      sendResponse(data);
    }
  })();
  return true;
});
