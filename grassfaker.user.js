// ==UserScript==
// @name         GrassFaker
// @namespace    fun.grassfaker
// @version      2.0.0
// @description  把 GitHub 贡献图涂成你想要的样子：全绿/区间/随机/清空/还原，支持打印文字与模板（纯本地视觉恶搞，不影响真实数据）
// @author       you
// @match        https://github.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ============ 5×7 像素字体（# = 亮，空格 = 暗） ============
  const FONT = {
    A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
    B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
    C: [' ### ', '#   #', '#    ', '#    ', '#    ', '#   #', ' ### '],
    D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
    E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
    F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
    G: [' ### ', '#   #', '#    ', '# ###', '#   #', '#   #', ' ### '],
    H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
    I: [' ### ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
    J: ['  ###', '   # ', '   # ', '   # ', '   # ', '#  # ', ' ##  '],
    K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
    L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
    M: ['#   #', '## ##', '# # #', '# # #', '#   #', '#   #', '#   #'],
    N: ['#   #', '##  #', '# # #', '#  ##', '#   #', '#   #', '#   #'],
    O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
    P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
    Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
    R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
    S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
    T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
    U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
    V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
    W: ['#   #', '#   #', '#   #', '# # #', '# # #', '## ##', '#   #'],
    X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
    Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
    Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
    '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
    '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
    '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
    '3': ['#####', '   # ', '  #  ', '   # ', '    #', '#   #', ' ### '],
    '4': ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
    '5': ['#####', '#    ', '#    ', '#### ', '    #', '    #', '#### '],
    '6': [' ### ', '#    ', '#    ', '#### ', '#   #', '#   #', ' ### '],
    '7': ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
    '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
    '9': [' ### ', '#   #', '#   #', ' ####', '    #', '    #', ' ### '],
    ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
  };

  // ============ 内置模板 ============
  // 两种形式：{ name, text } 用字体渲染；{ name, rows } 直接给 7 行像素图
  // rows 字符约定：#=当前色阶  0-4=指定色阶  .=置空  空格=不改动
  const templates = [
    { name: 'LOVE',   text: 'LOVE' },
    { name: 'HELLO',  text: 'HELLO' },
    { name: 'HI',     text: 'HI' },
    { name: '520',    text: '520' },
    { name: '1314',   text: '1314' },
    { name: 'LOL',    text: 'LOL' },
    { name: 'GOOD',   text: 'GOOD' },
    { name: 'COOL',   text: 'COOL' },
    { name: '❤ 爱心', rows: [' ## ## ', '#######', '#######', '#######', ' ##### ', '  ###  ', '   #   '] },
  ];

  // ============ 核心逻辑 ============
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const CELL = '[data-level]';
  const originals = new WeakMap(); // cell 节点 -> 原始 level
  const dayMs = 86400000;

  const cells = () => $$(CELL);

  function dateKey(cell) {
    const d = cell.getAttribute('data-date');
    if (d) return d;
    const hay = [cell.getAttribute('data-tooltip'), cell.getAttribute('aria-label'), cell.id].join(' ');
    const m = hay.match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : null;
  }
  function parse(dstr) { return new Date(dstr + 'T00:00:00'); }
  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function remember(cell) {
    if (!originals.has(cell)) originals.set(cell, cell.getAttribute('data-level'));
  }
  function setLevel(cell, level) {
    remember(cell);
    cell.setAttribute('data-level', String(level));
  }

  function applyAll(level) {
    const list = cells();
    list.forEach(c => setLevel(c, level));
    return list.length;
  }
  function applyRange(from, to, level) {
    let n = 0;
    cells().forEach(c => {
      const d = dateKey(c);
      if (d && d >= from && d <= to) { setLevel(c, level); n++; }
    });
    return n;
  }
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function applyRandom(min, max, from, to) {
    let n = 0;
    cells().forEach(c => {
      if (from && to) {
        const d = dateKey(c);
        if (!d || d < from || d > to) return;
      }
      setLevel(c, rand(min, max)); n++;
    });
    return n;
  }
  function restore() {
    let n = 0;
    cells().forEach(c => {
      if (originals.has(c)) { c.setAttribute('data-level', originals.get(c)); n++; }
    });
    return n;
  }

  // ---- 模板渲染与打印 ----
  function renderText(text) {
    const chars = [...String(text).toUpperCase()];
    const rows = ['', '', '', '', '', '', ''];
    chars.forEach((ch, i) => {
      const g = FONT[ch] || FONT[' '];
      for (let r = 0; r < 7; r++) rows[r] += (i ? ' ' : '') + g[r];
    });
    return rows;
  }
  function tplRows(t) { return t.rows || renderText(t.text || ''); }
  function tplWidth(t) { return Math.max(...tplRows(t).map(r => r.length)); }

  // 探测贡献图最上面一行是星期几（默认周日），避免文字上下颠倒
  let topDay = 0;
  function detectTopDay() {
    const byWeek = {};
    cells().forEach(c => {
      const d = dateKey(c); if (!d) return;
      const dt = parse(d);
      const sun = new Date(dt); sun.setDate(dt.getDate() - dt.getDay());
      const k = fmt(sun);
      (byWeek[k] = byWeek[k] || []).push(c);
    });
    for (const k of Object.keys(byWeek).sort()) {
      const col = byWeek[k];
      if (col.length >= 7) {
        col.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        return parse(dateKey(col[0])).getDay();
      }
    }
    return 0;
  }

  function stamp(rows, anchorStr, level) {
    const width = Math.max(...rows.map(r => r.length));
    if (!anchorStr || !width) return 0;
    const a = parse(anchorStr);
    const sunA = new Date(a); sunA.setDate(a.getDate() - a.getDay());
    let n = 0;
    cells().forEach(c => {
      const dstr = dateKey(c); if (!dstr) return;
      const d = parse(dstr);
      const row = (d.getDay() - topDay + 7) % 7;
      const sunD = new Date(d); sunD.setDate(d.getDate() - d.getDay());
      const col = Math.round((sunD - sunA) / (7 * dayMs));
      if (col < 0 || col >= width) return;
      const ch = rows[row] && rows[row][col];
      if (!ch || ch === ' ') return;
      let lvl;
      if (ch === '#') lvl = level;
      else if (ch === '.') lvl = 0;
      else lvl = Number(ch);
      if (lvl < 0 || lvl > 4) return;
      setLevel(c, lvl); n++;
    });
    return n;
  }
  function defaultAnchor(width) {
    const ds = cells().map(dateKey).filter(Boolean).sort();
    if (!ds.length) return '';
    const last = parse(ds[ds.length - 1]);
    const sun = new Date(last); sun.setDate(last.getDate() - last.getDay());
    sun.setDate(sun.getDate() - (width - 1) * 7);
    return fmt(sun);
  }

  // ============ 面板 UI ============
  const LEVELS = [
    { v: 0, label: '0', tip: '无',   color: '#ebedf0', fg: '#24292f' },
    { v: 1, label: '1', tip: '少量', color: '#9be9a8', fg: '#1a7f37' },
    { v: 2, label: '2', tip: '中等', color: '#40c463', fg: '#fff' },
    { v: 3, label: '3', tip: '较多', color: '#30a14e', fg: '#fff' },
    { v: 4, label: '4', tip: '大量', color: '#216e39', fg: '#fff' },
  ];

  let level = 4;

  const css = `
    .fgp-root{position:fixed;top:12px;right:12px;z-index:999999;
      width:250px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);
      overflow-y:auto;font:12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
      background:#161b22;color:#e6edf3;border:1px solid #30363d;border-radius:10px;
      box-shadow:0 8px 24px rgba(0,0,0,.4);user-select:none;}
    .fgp-header{display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:move;
      border-bottom:1px solid #30363d;position:sticky;top:0;background:#161b22;z-index:1;}
    .fgp-title{font-weight:600;flex:1;font-size:12px;}
    .fgp-btn{background:#21262d;color:#e6edf3;border:1px solid #30363d;border-radius:6px;
      padding:3px 7px;cursor:pointer;font-size:11px;}
    .fgp-btn:hover{background:#30363d;}
    .fgp-btn.mini{padding:2px 6px;line-height:1;}
    .fgp-body{padding:10px;display:flex;flex-direction:column;gap:8px;}
    .fgp-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
    .fgp-label{color:#8b949e;font-size:11px;min-width:30px;}
    .fgp-swatch{width:28px;height:18px;border-radius:5px;border:2px solid transparent;
      cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;}
    .fgp-swatch.on{border-color:#58a6ff;}
    .fgp-input{background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:6px;
      padding:4px 6px;font-size:12px;width:108px;min-width:0;box-sizing:border-box;}
    .fgp-input.num{width:44px;flex:none;}
    .fgp-input:disabled,.fgp-act:disabled{opacity:.4;cursor:not-allowed;}
    .fgp-act{flex:1;background:#238636;border:1px solid rgba(240,246,252,.1);border-radius:6px;
      color:#fff;padding:5px 8px;cursor:pointer;font-size:12px;font-weight:600;}
    .fgp-act:hover{background:#2ea043;}
    .fgp-act.warn{background:#21262d;border-color:#30363d;}
    .fgp-act.warn:hover{background:#30363d;}
    .fgp-status{font-size:11px;color:#8b949e;border-top:1px solid #30363d;padding-top:7px;}
    .fgp-fab{position:fixed;right:16px;bottom:16px;z-index:999999;width:40px;height:40px;
      border-radius:50%;background:#238636;color:#fff;border:none;font-size:18px;cursor:pointer;
      box-shadow:0 4px 12px rgba(0,0,0,.4);display:none;}
  `;

  let root, bodyEl, statusEl, fromInput, toInput, minInput, maxInput;
  let selectEl, anchorEl, textEl;
  let levelBtns = [];
  let injected = false;

  function status(msg) { if (statusEl) statusEl.textContent = msg; }

  function rebuildSelect() {
    if (!selectEl) return;
    const prev = selectEl.value;
    selectEl.innerHTML = templates.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    selectEl.value = (prev && Number(prev) < templates.length) ? prev : '0';
  }
  function updateAnchor() {
    const t = templates[Number(selectEl.value)];
    if (t && anchorEl) anchorEl.value = defaultAnchor(tplWidth(t));
  }

  function buildPanel() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    root = document.createElement('div');
    root.className = 'fgp-root';
    root.innerHTML = `
      <div class="fgp-header">
        <span class="fgp-title">🎨 GrassFaker</span>
        <button class="fgp-btn mini" data-act="collapse">—</button>
        <button class="fgp-btn mini" data-act="close">✕</button>
      </div>
      <div class="fgp-body">
        <div class="fgp-row" style="gap:4px">
          <span class="fgp-label" style="min-width:auto">色阶</span>
          ${LEVELS.map(l => `<div class="fgp-swatch" data-v="${l.v}" title="${l.tip}" style="background:${l.color};color:${l.fg}">${l.label}</div>`).join('')}
          <span class="fgp-label" style="min-width:auto;color:#6e7681">(0-4)</span>
        </div>
        <div class="fgp-row">
          <button class="fgp-act" data-act="all">▶ 全部变此色阶</button>
        </div>
        <div class="fgp-row">
          <span class="fgp-label">从</span>
          <input class="fgp-input" type="date" data-role="from" style="flex:1">
        </div>
        <div class="fgp-row">
          <span class="fgp-label">到</span>
          <input class="fgp-input" type="date" data-role="to" style="flex:1">
        </div>
        <div class="fgp-row">
          <button class="fgp-act" data-act="range">▶ 区间变此色阶</button>
        </div>
        <div class="fgp-row">
          <span class="fgp-label">随机</span>
          <input class="fgp-input num" type="number" min="0" max="4" value="2" data-role="min">
          <span style="color:#8b949e">~</span>
          <input class="fgp-input num" type="number" min="0" max="4" value="4" data-role="max">
        </div>
        <div class="fgp-row">
          <button class="fgp-act" data-act="rand-all">▶ 随机全部</button>
          <button class="fgp-act" data-act="rand-range">▶ 随机区间</button>
        </div>
        <div class="fgp-row" style="border-top:1px solid #30363d;padding-top:12px">
          <span class="fgp-label" style="color:#e6edf3">模板</span>
          <select class="fgp-input" data-role="tpl" style="flex:1"></select>
        </div>
        <div class="fgp-row">
          <span class="fgp-label">起始</span>
          <input class="fgp-input" type="date" data-role="anchor" style="flex:1">
        </div>
        <div class="fgp-row">
          <span class="fgp-label">文字</span>
          <input class="fgp-input" type="text" placeholder="自定义, 如 YOUR NAME" data-role="text" style="flex:1">
        </div>
        <div class="fgp-row">
          <button class="fgp-act" data-act="stamp">▶ 打印模板</button>
          <button class="fgp-act" data-act="stamp-text">▶ 打印文字</button>
        </div>
        <div class="fgp-row">
          <button class="fgp-act warn" data-act="clear">🧹 清空全部</button>
          <button class="fgp-act warn" data-act="restore">↩ 还原</button>
        </div>
        <div class="fgp-status">加载中…</div>
      </div>`;

    document.body.appendChild(root);

    bodyEl    = $('.fgp-body', root);
    statusEl  = $('.fgp-status', root);
    fromInput = $('[data-role="from"]', root);
    toInput   = $('[data-role="to"]', root);
    minInput  = $('[data-role="min"]', root);
    maxInput  = $('[data-role="max"]', root);
    selectEl  = $('[data-role="tpl"]', root);
    anchorEl  = $('[data-role="anchor"]', root);
    textEl    = $('[data-role="text"]', root);
    levelBtns = $$('.fgp-swatch', root);
    const rangeBtn = $('[data-act="range"]', root);
    const randRangeBtn = $('[data-act="rand-range"]', root);
    const stampBtn = $('[data-act="stamp"]', root);
    const stampTextBtn = $('[data-act="stamp-text"]', root);

    // 色阶选择
    levelBtns.forEach(b => b.addEventListener('click', () => {
      level = Number(b.dataset.v);
      levelBtns.forEach(x => x.classList.toggle('on', x === b));
    }));
    levelBtns.find(b => Number(b.dataset.v) === level)?.classList.add('on');

    // 诊断：日期能否识别
    const dated = cells().map(dateKey).filter(Boolean);
    const hasDates = dated.length > 0;
    if (hasDates) {
      const sorted = dated.slice().sort();
      fromInput.min = toInput.min = sorted[0];
      fromInput.max = toInput.max = sorted[sorted.length - 1];
      fromInput.value = sorted[0];
      toInput.value   = sorted[sorted.length - 1];
      topDay = detectTopDay();
      rebuildSelect();
      updateAnchor(); // 仅在初始化时设一次起始日期，切换模板不再自动改
    } else {
      fromInput.disabled = toInput.disabled = rangeBtn.disabled = randRangeBtn.disabled = true;
      selectEl.disabled = anchorEl.disabled = textEl.disabled = stampBtn.disabled = stampTextBtn.disabled = true;
    }

    // 动作分发
    const clamp = (v) => Math.max(0, Math.min(4, Number(v)));
    const randomRange = () => {
      const lo = clamp(Number(minInput.value) || 0);
      const hi = clamp(Number(maxInput.value) || 4);
      return [Math.min(lo, hi), Math.max(lo, hi)];
    };

    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      let n = 0;
      if (act === 'all')        n = applyAll(level);
      if (act === 'range')      n = applyRange(fromInput.value, toInput.value, level);
      if (act === 'rand-all')   { const [lo, hi] = randomRange(); n = applyRandom(lo, hi); }
      if (act === 'rand-range') { const [lo, hi] = randomRange(); n = applyRandom(lo, hi, fromInput.value, toInput.value); }
      if (act === 'clear')      n = applyAll(0);
      if (act === 'restore')    n = restore();
      if (act === 'stamp') {
        const t = templates[Number(selectEl.value)];
        if (t) n = stamp(tplRows(t), anchorEl.value, level);
      }
      if (act === 'stamp-text') {
        const txt = textEl.value.trim();
        if (!txt) { status('先在「文字」框输入内容'); return; }
        const rows = renderText(txt);
        const anchor = anchorEl.value || defaultAnchor(Math.max(...rows.map(r => r.length)));
        n = stamp(rows, anchor, level);
      }
      if (act === 'collapse')   bodyEl.style.display = bodyEl.style.display === 'none' ? '' : 'none';
      if (act === 'close')      hidePanel();
      status(`${act === 'restore' ? '已还原' : act === 'clear' ? '已清空' : '已应用'} ${n} 格`);
    });

    status(`就绪 · 共 ${cells().length} 格 · 日期 ${dated.length} 个 · 模板 ${templates.length} 个`);

    // 拖拽
    let sx, sy, ox, oy, dragging = false;
    const header = $('.fgp-header', root);
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('[data-act]')) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = root.offsetLeft; oy = root.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      root.style.left = (ox + e.clientX - sx) + 'px';
      root.style.top  = (oy + e.clientY - sy) + 'px';
      root.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  // 收起后的小圆点
  let fab;
  function hidePanel() {
    if (root) root.style.display = 'none';
    if (!fab) {
      fab = document.createElement('button');
      fab.className = 'fgp-fab';
      fab.textContent = '🎨';
      fab.title = '打开贡献图调色板';
      fab.addEventListener('click', showPanel);
      document.body.appendChild(fab);
    }
    fab.style.display = 'block';
  }
  function showPanel() {
    if (root) root.style.display = '';
    if (fab) fab.style.display = 'none';
  }

  // ============ 初始化 ============
  function ensurePanel() {
    if (!cells().length) return;
    if (injected) return;
    injected = true;
    buildPanel();
  }

  ensurePanel();
  setTimeout(ensurePanel, 2000);
  setTimeout(ensurePanel, 5000);
  new MutationObserver(ensurePanel).observe(document.body, { childList: true, subtree: true });
})();
