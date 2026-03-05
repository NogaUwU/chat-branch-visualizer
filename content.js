(() => {
  const KEY = 'cbv_state_v1';
  const HOVER_DELAY = 140;

  let state = {
    convKey: getConversationKey(),
    nodes: [],
    children: {},
    roots: [],
    activeNodeId: null,
    previewNodeId: null
  };

  let panel;
  let hoverTimer;

  const msgCache = new Map(); // id -> element

  init();

  async function init() {
    await loadState();
    buildPanel();
    if (!state.nodes.length) refreshFromDOM();
    bindHotkeys();
    renderPanel();
  }

  function getConversationKey() {
    return location.origin + location.pathname;
  }

  function uid(prefix='n') {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  async function loadState() {
    const all = await chrome.storage.local.get(KEY);
    const byConv = all[KEY] || {};
    if (byConv[state.convKey]) {
      state = { ...state, ...byConv[state.convKey], convKey: state.convKey };
    }
  }

  async function saveState() {
    const all = await chrome.storage.local.get(KEY);
    const byConv = all[KEY] || {};
    byConv[state.convKey] = {
      nodes: state.nodes,
      children: state.children,
      roots: state.roots,
      activeNodeId: state.activeNodeId
    };
    await chrome.storage.local.set({ [KEY]: byConv });
  }

  function buildPanel() {
    if (document.getElementById('cbv-panel')) return;
    panel = document.createElement('aside');
    panel.id = 'cbv-panel';
    panel.innerHTML = `
      <div class="cbv-header">
        <div class="cbv-title">Branch Visualizer (MVP)</div>
        <div class="cbv-actions">
          <button id="cbv-refresh">Refresh</button>
          <button id="cbv-hide">Hide</button>
        </div>
      </div>
      <div class="cbv-badge" id="cbv-status">Ready</div>
      <div id="cbv-tree"></div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#cbv-refresh').addEventListener('click', () => {
      refreshFromDOM();
    });

    panel.querySelector('#cbv-hide').addEventListener('click', () => {
      panel.style.display = 'none';
      ensureShowButton();
    });
  }

  function ensureShowButton() {
    if (document.getElementById('cbv-show-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'cbv-show-btn';
    btn.textContent = '🌿 Branches';
    Object.assign(btn.style, {
      position: 'fixed', right: '16px', top: '16px', zIndex: 999999,
      border: '1px solid #334155', borderRadius: '999px', padding: '8px 12px',
      background: '#0b1020', color: '#e5e7eb', cursor: 'pointer'
    });
    btn.addEventListener('click', () => {
      panel.style.display = 'block';
      btn.remove();
    });
    document.body.appendChild(btn);
  }

  function status(text) {
    const el = document.getElementById('cbv-status');
    if (el) el.textContent = text;
  }

  function getMessageElements() {
    const candidates = [
      'article',
      '[data-message-id]',
      '[data-testid*="conversation"]',
      '[class*="message"]'
    ];
    let els = [];
    for (const sel of candidates) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > els.length) els = found;
    }

    const filtered = els.filter(el => {
      const txt = (el.innerText || '').trim();
      if (!txt) return false;
      if (txt.length < 8) return false;
      return true;
    });

    return filtered;
  }

  function detectRole(el) {
    const text = (el.innerText || '').toLowerCase();
    if (text.includes('you said') || text.includes('you\n')) return 'user';
    if (el.querySelector('textarea')) return 'user';
    return 'assistant';
  }

  function refreshFromDOM() {
    const elements = getMessageElements();
    if (!elements.length) {
      status('No messages detected. Scroll chat and retry.');
      return;
    }

    msgCache.clear();
    const linear = [];
    let parentId = null;

    elements.forEach((el, idx) => {
      const id = `m_${idx}_${hash((el.innerText || '').slice(0, 80))}`;
      msgCache.set(id, el);
      linear.push({
        id,
        parentId,
        depth: parentId ? (linear[idx - 1]?.depth || 0) + 1 : 0,
        role: detectRole(el),
        text: ((el.innerText || '').trim()).replace(/\s+/g, ' ').slice(0, 160),
        ts: Date.now(),
        virtual: false
      });
      parentId = id;
    });

    const children = {};
    linear.forEach(n => {
      if (!children[n.parentId || 'root']) children[n.parentId || 'root'] = [];
      children[n.parentId || 'root'].push(n.id);
    });

    state.nodes = linear;
    state.children = children;
    state.roots = children.root || [];
    state.activeNodeId = state.activeNodeId || linear[linear.length - 1].id;
    state.previewNodeId = null;

    saveState();
    renderPanel();
    status(`Loaded ${linear.length} nodes`);
  }

  function renderPanel() {
    const tree = document.getElementById('cbv-tree');
    if (!tree) return;
    tree.innerHTML = '';

    const byId = Object.fromEntries(state.nodes.map(n => [n.id, n]));

    function renderNode(id, depth = 0) {
      const n = byId[id];
      if (!n) return;

      const row = document.createElement('div');
      row.className = `cbv-node cbv-depth-${Math.min(depth, 4)}`;
      if (id === state.activeNodeId) row.classList.add('active');
      if (id === state.previewNodeId) row.classList.add('preview');

      row.innerHTML = `
        <div class="cbv-node-top">
          <div class="cbv-meta">${n.role} · d${depth}${n.virtual ? ' · branch' : ''}</div>
          <button class="cbv-branch-btn" data-branch-from="${id}">+Branch</button>
        </div>
        <div class="cbv-text">${escapeHtml(n.text || '(empty)')}</div>
      `;

      row.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => previewNode(id), HOVER_DELAY);
      });
      row.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
      });
      row.addEventListener('click', (e) => {
        if ((e.target).matches('.cbv-branch-btn')) return;
        pinActive(id);
      });

      row.querySelector('.cbv-branch-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        branchFrom(id);
      });

      tree.appendChild(row);

      const kids = state.children[id] || [];
      kids.forEach(childId => renderNode(childId, depth + 1));
    }

    (state.roots || []).forEach(r => renderNode(r, 0));
  }

  function pinActive(id) {
    state.activeNodeId = id;
    state.previewNodeId = null;
    clearHighlights();
    applyFocusPath(id);
    renderPanel();
    saveState();
    status(`Active: ${short(id)}`);
  }

  function previewNode(id) {
    state.previewNodeId = id;
    renderPanel();
    clearHighlights();
    applyFocusPath(id);
    status(`Preview: ${short(id)} (Esc to restore active)`);
  }

  function branchFrom(id) {
    const base = state.nodes.find(n => n.id === id);
    if (!base) return;

    const newId = uid('b');
    const branchNode = {
      id: newId,
      parentId: id,
      depth: (base.depth || 0) + 1,
      role: 'user',
      text: `Branch from: ${base.text.slice(0, 48)}...`,
      ts: Date.now(),
      virtual: true
    };

    state.nodes.push(branchNode);
    if (!state.children[id]) state.children[id] = [];
    state.children[id].push(newId);

    renderPanel();
    saveState();
    status(`Created branch ${short(newId)} from ${short(id)}`);
  }

  function applyFocusPath(targetId) {
    const path = new Set(ancestorChain(targetId));
    msgCache.forEach((el, id) => {
      el.classList.remove('cbv-dim', 'cbv-focus');
      if (!path.has(id)) {
        el.classList.add('cbv-dim');
      } else if (id === targetId) {
        el.classList.add('cbv-focus');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  function clearHighlights() {
    msgCache.forEach((el) => el.classList.remove('cbv-dim', 'cbv-focus'));
  }

  function ancestorChain(id) {
    const byId = Object.fromEntries(state.nodes.map(n => [n.id, n]));
    const chain = [];
    let cur = byId[id];
    while (cur) {
      chain.unshift(cur.id);
      cur = byId[cur.parentId];
    }
    return chain;
  }

  function bindHotkeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        state.previewNodeId = null;
        renderPanel();
        clearHighlights();
        if (state.activeNodeId) applyFocusPath(state.activeNodeId);
        status('Preview cleared');
      }
    });
  }

  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  }

  function short(id) {
    return id.slice(0, 10);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
