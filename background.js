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
  const LABEL_H = 28;

  // Push page content left to make room for the mobile panel
  document.documentElement.style.cssText +=
    `;margin-right:${MOBILE_WIDTH}px !important;box-sizing:border-box;`;

  // Fixed right panel — only this is an iframe (sub_frame), so only this gets mobile UA
  const panel = document.createElement('div');
  panel.id = 'amz-split-host';
  panel.style.cssText = [
    'position:fixed', 'top:0', 'right:0', 'bottom:0',
    `width:${MOBILE_WIDTH}px`, 'z-index:2147483647',
    'display:flex', 'flex-direction:column',
    'border-left:3px solid #FF9900', 'background:#fff', 'box-shadow:-4px 0 12px rgba(0,0,0,.15)'
  ].join(';');

  // Label bar
  const label = document.createElement('div');
  label.style.cssText = [
    'background:#FF9900', 'color:#111',
    `font:700 11px/${LABEL_H}px sans-serif`,
    'text-align:center', 'flex-shrink:0',
    'position:relative', 'letter-spacing:.4px'
  ].join(';');
  label.textContent = '📱  MOBILE · Amazon App UA';

  // Close button inside label
  const close = document.createElement('button');
  close.textContent = '✕';
  close.style.cssText = [
    'position:absolute', 'right:8px', 'top:50%', 'transform:translateY(-50%)',
    'border:none', 'background:rgba(0,0,0,.18)', 'color:#111',
    'border-radius:3px', 'padding:1px 7px', 'cursor:pointer',
    'font:700 11px sans-serif', 'line-height:18px'
  ].join(';');
  close.onclick = () => chrome.runtime.sendMessage({ action: 'restore' });
  label.appendChild(close);

  // Mobile iframe — this is the only sub_frame, so only this gets mobile UA
  const iframe = document.createElement('iframe');
  iframe.id = 'amz-split-mobile';
  iframe.src = window.location.href;
  iframe.style.cssText = 'flex:1; border:none; width:100%;';

  panel.appendChild(label);
  panel.appendChild(iframe);
  document.body.appendChild(panel);
}

function removeSplitLayout() {
  const panel = document.getElementById('amz-split-host');
  if (panel) panel.remove();
  document.documentElement.style.marginRight = '';
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
