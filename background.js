// background.js — service worker
// Responsibilities:
//   1. Open side panel when toolbar icon clicked
//   2. Route messages between content.js <-> sidepanel.js

importScripts('platform-config.js');

// ── Open side panel on action click ──────────────────────────────────────────
chrome.action.onClicked.addListener(tab => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// ── Enable side panel for supported pages ─────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== 'complete') return;
  const supported = cbvIsSupportedUrl(tab.url || '');
  chrome.sidePanel.setOptions({
    tabId,
    enabled: supported,
    path:    'sidepanel.html',
  });
});

// ── Message routing ───────────────────────────────────────────────────────────
// content.js  → background → sidepanel  (content sends tree data / nav results)
// sidepanel   → background → content    (sidepanel sends nav commands)

// Keep track of UI ports (sidepanel/viewer) for a given tab
const uiPorts = new Map(); // tabId -> Set<port>

function addUiPort(tabId, port) {
  if (!uiPorts.has(tabId)) uiPorts.set(tabId, new Set());
  uiPorts.get(tabId).add(port);
}

function removeUiPort(tabId, port) {
  const set = uiPorts.get(tabId);
  if (!set) return;
  set.delete(port);
  if (!set.size) uiPorts.delete(tabId);
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'cbv-sidepanel' && port.name !== 'cbv-viewer') return;

  // Figure out which tab this sidepanel belongs to
  // (sidePanel port doesn't expose tabId directly — we ask the panel to send it)
  let tabId = null;

  port.onMessage.addListener(async msg => {
    if (msg.type === 'REGISTER') {
      if (tabId && tabId !== msg.tabId) removeUiPort(tabId, port);
      tabId = msg.tabId;
      if (tabId) addUiPort(tabId, port);
      return;
    }

    // sidepanel → content: navigation / cancel commands
    if ((msg.type === 'NAVIGATE' || msg.type === 'CANCEL') && tabId) {
      chrome.tabs.sendMessage(tabId, msg).catch(() => {});
    }
  });

  port.onDisconnect.addListener(() => {
    if (tabId) removeUiPort(tabId, port);
  });
});

// content.js → background → UI clients
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  // Forward to all registered UIs for this tab
  const ports = uiPorts.get(tabId);
  if (ports) {
    for (const port of ports) {
      try { port.postMessage({ ...msg, tabId }); } catch (_) {}
    }
  }

  // Always ACK
  sendResponse({ ok: true });
  return true;
});
