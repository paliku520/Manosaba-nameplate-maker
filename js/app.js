/* ============================================================
 * app.js — 纯静态名片合成器
 *
 * 渲染规则与主项目 src/nameplate.py 保持一致（数据解析自游戏 bundle）：
 *   底板 NamePlateBase   601 × 289
 *   基准字号             136
 *   文本左边界           −213（相对底板中心）
 *   文本垂直中心         +14 （相对底板中心，Unity 坐标系）
 *   姓氏首字 = 1.0em / 名字首字 = 0.8em / 其余字 = 0.6em
 *
 * 名字过长时只向右加宽画布（字号不变），与原版 Pillow 实现一致。
 * 所有渲染都在浏览器 Canvas 中完成，无任何后端请求。
 * ============================================================ */
(function () {
  'use strict';

  const i18n = window.MCE_I18N;
  const t = (key, vars) => i18n.t(key, vars);

  const STORAGE_KEY = 'manosaba.nameplate.maker.v1';

  const CONFIG = {
    baseImage: 'assets/NamePlateBase.png',
    baseSize: { width: 601, height: 289 },
    fontSize: 136,
    marginLeft: -213,
    centerY: 14,
    rightPadding: 16,
    steps: { surname_head: 1.0, given_head: 0.8, rest: 0.6 },
    fonts: [
      {
        id: 'TsukushiMincho',
        label: 'TsukushiMincho',
        family: 'NP Tsukushi Mincho',
        file: 'assets/fonts/TsukushiMincho.otf',
      },
      {
        id: 'SourceHanSerifSC',
        label: 'SourceHanSerifSC',
        family: 'NP Source Han Serif SC',
        file: 'assets/fonts/SourceHanSerifSC.otf',
      },
    ],
  };

  const LEVELS = ['surname_head', 'given_head', 'rest'];

  // 游戏标题图：中文使用简体中文原图，其余语言统一使用日文原图
  const GAME_LOGOS = {
    zh_CN: 'assets/game_titles/TitleLogo@ZhHans.png',
    default: 'assets/game_titles/TitleLogo@Ja.png',
  };

  function gameLogoFor(lang) {
    return GAME_LOGOS[lang] || GAME_LOGOS.default;
  }

  // Pillow ImageFont.getmetrics() 的 (ascent, descent)。
  // Canvas 的 fontBoundingBox* 对个别字体（如 TsukushiMincho）与 FreeType
  // 的行高度量不一致，这里直接记录内置字体在三个字号下的度量，保证基线与原版一致。
  const FONT_METRICS = {
    TsukushiMincho: { 136: [120, 17], 109: [96, 14], 82: [73, 10] },
    SourceHanSerifSC: { 136: [157, 39], 109: [126, 32], 82: [95, 24] },
  };

  // 角色主题色（与主项目 webui/css/theme.css 的 html[data-accent] 一致）
  const PALETTE = [
    { id: '', color: '#FFFFFF' },
    { id: 'alisa', color: '#EA4D3E' },
    { id: 'anan', color: '#9D97F9' },
    { id: 'coco', color: '#F77449' },
    { id: 'ema', color: '#FF8FB4' },
    { id: 'hanna', color: '#A7CB1E' },
    { id: 'hiro', color: '#F84F5A' },
    { id: 'leia', color: '#FDB95B' },
    { id: 'margo', color: '#B87BF0' },
    { id: 'meruru', color: '#E2BFB8' },
    { id: 'miria', color: '#EFD28D' },
    { id: 'nanoka', color: '#84909A' },
    { id: 'noah', color: '#65E4EB' },
    { id: 'sherry', color: '#89B5FA' },
    { id: 'jailer', color: '#C5C9D4' },
    { id: 'warden', color: '#B3B1C5' },
    { id: 'yuki', color: '#C3D4ED' },
  ];

  const state = {
    ready: false,
    busy: false,
    dirty: false,
    theme: 'dark',
    surname: '',
    given: '',
    font: 'TsukushiMincho',
    headColor: '',
    fonts: [],
    baseImg: null,
    previewSize: null,
    lastRender: null,
    status: null,
  };

  const modal = {
    open: false,
    current: '#FFFFFF',
    previousFocus: null,
  };
  let modalHideTimer = 0;

  const loadedFaces = new Set();
  const els = {};
  let langDrop = null;
  let fontDrop = null;

  // ═════════════ 小工具 ═════════════

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function colorLabel(id) {
    return id || t('np.color_default');
  }

  function rgbToHex(r, g, b) {
    return ('#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')).toUpperCase();
  }

  function hexToRgb(hex) {
    const s = String(hex || '').replace('#', '');
    return {
      r: parseInt(s.slice(0, 2), 16) || 0,
      g: parseInt(s.slice(2, 4), 16) || 0,
      b: parseInt(s.slice(4, 6), 16) || 0,
    };
  }

  /** #RGB / #RRGGBB / RRGGBB / rgb(r,g,b) / r,g,b → #RRGGBB；无效返回 null */
  function parseColor(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const m = raw.match(/^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})/i);
    const parts = m ? [m[1], m[2], m[3]]
      : (raw.indexOf(',') >= 0 ? raw.split(',').map((s) => s.trim()).slice(0, 3) : null);
    if (parts) {
      if (parts.length !== 3 || !parts.every((s) => /^\d{1,3}$/.test(s))) return null;
      const n = parts.map(Number);
      if (n.some((v) => v > 255)) return null;
      return rgbToHex(n[0], n[1], n[2]);
    }
    const s = raw.replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(s)) {
      return ('#' + s.split('').map((c) => c + c).join('')).toUpperCase();
    }
    if (/^[0-9a-fA-F]{6}$/.test(s)) {
      return ('#' + s).toUpperCase();
    }
    return null;
  }

  function hslToHex(h, s, l) {
    const sat = s / 100;
    const light = l / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = sat * Math.min(light, 1 - light);
    const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return ('#' + [f(0), f(8), f(4)]
      .map((v) => Math.round(255 * v).toString(16).padStart(2, '0')).join('')).toUpperCase();
  }

  function hexToHsl(hex) {
    const s = String(hex || '').replace('#', '');
    const r = parseInt(s.slice(0, 2), 16) / 255;
    const g = parseInt(s.slice(2, 4), 16) / 255;
    const b = parseInt(s.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let sat = 0;
    if (d) {
      sat = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: sat * 100, l: l * 100 };
  }

  const NP_SAT = 70;
  const NP_HUE_STOPS = [0, 22, 45, 68, 100, 160, 190, 210, 232, 262, 290, 330];

  function planeColorAt(x, y) {
    const hue = Math.round(Math.min(1, Math.max(0, x)) * 360);
    const yy = Math.min(1, Math.max(0, y));
    const l = yy <= 0.5 ? 100 - yy * 100 : (1 - yy) * 100;
    return hslToHex(hue, NP_SAT, l);
  }

  function planeBackgroundCss() {
    const stops = NP_HUE_STOPS.map((h) =>
      'hsl(' + h + ', ' + NP_SAT + '%, 50%) ' + (h / 360 * 100).toFixed(2) + '%');
    stops.push('hsl(360, ' + NP_SAT + '%, 50%) 100%');
    const hue = 'linear-gradient(to right, ' + stops.join(', ') + ')';
    const light = 'linear-gradient(to bottom, #FFFFFF 0%, rgba(255,255,255,0) 50%, #000000 100%)';
    return light + ', ' + hue;
  }

  function safeName(text) {
    const raw = String(text || '').trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/[. ]+$/g, '');
    if (!raw || raw === '.' || raw === '..') return 'nameplate';
    return raw.slice(0, 160);
  }

  function fontDef(id) {
    return CONFIG.fonts.find((f) => f.id === id) || CONFIG.fonts[0];
  }

  function fontSizeForLevel(level) {
    return Math.max(1, Math.round(CONFIG.fontSize * (CONFIG.steps[level] || 0.6)));
  }

  function fontSpec(def, size) {
    return size + 'px "' + def.family + '"';
  }

  function metricsFor(fontId, size) {
    const table = FONT_METRICS[fontId] || {};
    if (table[size]) return table[size];
    const base = table[136] || [Math.round(size * 0.88), Math.round(size * 0.12)];
    const k = size / 136;
    return [Math.round(base[0] * k), Math.round(base[1] * k)];
  }

  // ═════════════ 下拉控件（非原生 select）═════════════

  const dropdownRegistry = [];
  let dropdownSeq = 0;

  function closeAllDropdowns(except) {
    dropdownRegistry.forEach((dd) => {
      if (dd !== except) dd.close();
    });
  }

  /**
   * 轻量自定义下拉：按钮触发 + listbox 菜单，支持鼠标、方向键、Home/End、
   * Enter/Space 选择、Esc 关闭、Tab 关闭并继续移动焦点。
   */
  function createDropdown(config) {
    const opts = config || {};

    const root = document.createElement('div');
    root.className = 'dd' + (opts.className ? ' ' + opts.className : '');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'dd-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valueEl = document.createElement('span');
    valueEl.className = 'dd-value';

    const caret = document.createElement('span');
    caret.className = 'dd-caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12">'
      + '<path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" '
      + 'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    trigger.appendChild(valueEl);
    trigger.appendChild(caret);

    const menu = document.createElement('div');
    menu.className = 'dd-menu' + (opts.menuClass ? ' ' + opts.menuClass : '');
    menu.id = 'np-dd-menu-' + (++dropdownSeq);
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    trigger.setAttribute('aria-controls', menu.id);

    root.appendChild(trigger);
    root.appendChild(menu);

    let options = Array.isArray(opts.options) ? opts.options.slice() : [];
    let value = opts.value == null ? '' : String(opts.value);
    let placeholder = opts.placeholder == null ? '' : String(opts.placeholder);
    let disabled = !!opts.disabled;
    let open = false;
    let ariaBase = opts.ariaLabel ? String(opts.ariaLabel) : '';

    function selectedLabel() {
      const hit = options.find((opt) => String(opt.value) === value);
      return hit ? String(hit.label) : '';
    }

    function syncAria() {
      if (!ariaBase) {
        trigger.removeAttribute('aria-label');
        return;
      }
      const text = selectedLabel() || placeholder;
      trigger.setAttribute('aria-label', ariaBase + (text ? ': ' + text : ''));
    }

    function syncTrigger() {
      const label = selectedLabel();
      valueEl.textContent = label || placeholder;
      trigger.classList.toggle('is-placeholder', !label);
      syncAria();
    }

    function syncSelection() {
      menu.querySelectorAll('.dd-option').forEach((el) => {
        const selected = el.dataset.value === value;
        el.classList.toggle('selected', selected);
        el.setAttribute('aria-selected', String(selected));
      });
    }

    function optionElements() {
      return Array.from(menu.querySelectorAll('.dd-option'));
    }

    function renderOptions() {
      menu.innerHTML = '';
      options.forEach((opt) => {
        const item = document.createElement('div');
        item.className = 'dd-option';
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', '-1');
        item.setAttribute('aria-selected', 'false');
        item.dataset.value = String(opt.value);
        const label = document.createElement('span');
        label.className = 'dd-option-label';
        label.textContent = String(opt.label);
        const check = document.createElement('span');
        check.className = 'dd-check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '\u2713';
        item.appendChild(label);
        item.appendChild(check);
        item.addEventListener('click', () => select(item.dataset.value));
        menu.appendChild(item);
      });
      syncSelection();
    }

    function focusOption(index) {
      const items = optionElements();
      if (!items.length) return;
      const i = Math.max(0, Math.min(items.length - 1, index));
      items.forEach((el, idx) => el.classList.toggle('active', idx === i));
      items[i].focus();
      try { items[i].scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
    }

    function focusSelected(direction) {
      const items = optionElements();
      if (!items.length) return;
      if (direction === 'last') {
        focusOption(items.length - 1);
        return;
      }
      let idx = items.findIndex((el) => el.dataset.value === value);
      if (idx < 0) idx = 0;
      focusOption(idx);
    }

    function openMenu(direction) {
      if (disabled || open || !options.length) return;
      closeAllDropdowns(api);
      open = true;
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      root.classList.add('open');
      setTimeout(() => {
        if (open) focusSelected(direction);
      }, 0);
    }

    function closeMenu(focusTrigger) {
      if (!open) return;
      open = false;
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      root.classList.remove('open');
      menu.querySelectorAll('.dd-option.active').forEach((el) => el.classList.remove('active'));
      if (focusTrigger) trigger.focus();
    }

    function select(next) {
      const nextValue = String(next);
      const changed = nextValue !== value;
      value = nextValue;
      syncTrigger();
      syncSelection();
      closeMenu(true);
      if (changed && typeof opts.onChange === 'function') opts.onChange(value);
    }

    function onTriggerKeydown(e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) {
          openMenu(e.key === 'ArrowUp' ? 'last' : 'selected');
        } else {
          const items = optionElements();
          const idx = items.indexOf(document.activeElement);
          focusOption(e.key === 'ArrowDown' ? idx + 1 : idx - 1);
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (open) closeMenu(false);
        else openMenu('selected');
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        closeMenu(true);
      }
    }

    function onMenuKeydown(e) {
      const items = optionElements();
      const idx = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusOption(idx < 0 ? 0 : idx + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusOption(idx < 0 ? items.length - 1 : idx - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusOption(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        focusOption(items.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (idx >= 0) select(items[idx].dataset.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu(true);
      } else if (e.key === 'Tab') {
        closeMenu(true);
      }
    }

    function onDocPointerDown(e) {
      if (open && !root.contains(e.target)) closeMenu(false);
    }

    trigger.addEventListener('click', () => {
      if (open) closeMenu(false);
      else openMenu('selected');
    });
    trigger.addEventListener('keydown', onTriggerKeydown);
    menu.addEventListener('keydown', onMenuKeydown);
    document.addEventListener('pointerdown', onDocPointerDown);

    const api = {
      el: root,
      setOptions(nextOptions, nextPlaceholder) {
        options = Array.isArray(nextOptions) ? nextOptions.slice() : [];
        if (nextPlaceholder !== undefined) placeholder = String(nextPlaceholder);
        if (open) closeMenu(false);
        if (!options.length) {
          value = '';
        } else if (!options.some((opt) => String(opt.value) === value)) {
          value = String(options[0].value);
        }
        renderOptions();
        syncTrigger();
      },
      setValue(next, silent) {
        const nextValue = next == null ? '' : String(next);
        const changed = nextValue !== value;
        value = nextValue;
        syncTrigger();
        syncSelection();
        if (open) closeMenu(false);
        if (changed && !silent && typeof opts.onChange === 'function') opts.onChange(value);
      },
      setDisabled(next) {
        disabled = !!next;
        trigger.disabled = disabled;
        trigger.setAttribute('aria-disabled', String(disabled));
        if (disabled) closeMenu(false);
      },
      setAriaLabel(label) {
        ariaBase = String(label || '');
        if (ariaBase) menu.setAttribute('aria-label', ariaBase);
        else menu.removeAttribute('aria-label');
        syncAria();
      },
      close() { closeMenu(false); },
      isOpen() { return open; },
    };

    if (opts.ariaLabel) api.setAriaLabel(opts.ariaLabel);
    api.setOptions(options, placeholder);
    api.setDisabled(disabled);
    dropdownRegistry.push(api);
    return api;
  }

  // ═════════════ 渲染 ═════════════

  function buildSegments(surname, given) {
    const segs = [];
    const s = Array.from(String(surname || '').trim());
    if (s.length) {
      segs.push({ text: s[0], level: 'surname_head' });
      if (s.length > 1) segs.push({ text: s.slice(1).join(''), level: 'rest' });
    }
    const g = Array.from(String(given || '').trim());
    if (g.length) {
      segs.push({ text: g[0], level: 'given_head' });
      if (g.length > 1) segs.push({ text: g.slice(1).join(''), level: 'rest' });
    }
    return segs;
  }

  function measureTextWidth(ctx, segs, def) {
    let total = 0;
    for (const seg of segs) {
      ctx.font = fontSpec(def, fontSizeForLevel(seg.level));
      for (const ch of Array.from(seg.text)) {
        if (ch !== '\n') total += ctx.measureText(ch).width;
      }
    }
    return total;
  }

  function drawText(ctx, segs, def, headColor, textLeft, baseHeight) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const metrics = LEVELS.map((level) => metricsFor(def.id, fontSizeForLevel(level)));
    const maxAscent = Math.max.apply(null, metrics.map((m) => m[0]));
    const maxDescent = Math.max.apply(null, metrics.map((m) => m[1]));
    // Unity 的 y 轴向上；Canvas 向下。行盒（最大字号）的垂直中心对齐 +14。
    // Pillow 会把起点/基线的小数部分交给 FreeType 处理；Canvas 在 .5 处会略低/略右，
    // 这里取整以复现原版落点（对 601×289 底板最多 0.5px，肉眼不可见）。
    const baseline = Math.floor(baseHeight / 2 - CONFIG.centerY + (maxAscent - maxDescent) / 2);

    let x = Math.round(textLeft);
    for (const seg of segs) {
      ctx.font = fontSpec(def, fontSizeForLevel(seg.level));
      ctx.fillStyle = (seg.level === 'surname_head' && headColor) ? headColor : '#FFFFFF';
      for (const ch of Array.from(seg.text)) {
        if (ch === '\n') continue;
        ctx.fillText(ch, x, baseline);
        x += ctx.measureText(ch).width;
      }
    }
  }

  /** 生成名片画布（同步）。params: {surname, given, font, headColor} */
  function renderCanvas(params) {
    if (!state.baseImg) throw new Error('Base plate is not loaded');
    const opts = params || {};
    const fontId = opts.font || state.font;
    const def = CONFIG.fonts.find((f) => f.id === fontId);
    if (!def) throw new Error('Unknown font: ' + fontId);
    if (state.fonts.indexOf(def.id) < 0) throw new Error('Font is not available: ' + def.id);

    const surname = String(opts.surname || '').trim();
    const given = String(opts.given || '').trim();
    const headColor = opts.headColor ? (parseColor(opts.headColor) || '#FFFFFF') : '';
    const segs = buildSegments(surname, given);

    const measureCtx = document.createElement('canvas').getContext('2d');
    const textWidth = measureTextWidth(measureCtx, segs, def);

    const baseWidth = CONFIG.baseSize.width;
    const baseHeight = CONFIG.baseSize.height;
    const textLeft = baseWidth / 2 + CONFIG.marginLeft;
    const width = Math.max(baseWidth, Math.ceil(textLeft + textWidth + CONFIG.rightPadding));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = baseHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.baseImg, 0, 0);
    if (segs.length) drawText(ctx, segs, def, headColor, textLeft, baseHeight);

    return canvas;
  }

  // ═════════════ UI 状态 ═════════════

  function cacheElements() {
    els.langSlot = document.getElementById('np-lang-dd');
    els.themeBtn = document.getElementById('np-theme-btn');
    els.gameLogo = document.getElementById('np-game-logo');
    els.gameTitle = document.querySelector('.hero-game');
    els.surname = document.getElementById('np-surname');
    els.given = document.getElementById('np-given');
    els.fontSlot = document.getElementById('np-font-dd');
    els.colorBtn = document.getElementById('np-color-btn');
    els.colorSwatch = document.getElementById('np-color-swatch');
    els.colorName = document.getElementById('np-color-name');
    els.status = document.getElementById('np-status');
    els.stageEmpty = document.getElementById('np-stage-empty');
    els.img = document.getElementById('np-img');
    els.generate = document.getElementById('np-btn-generate');
    els.copy = document.getElementById('np-btn-copy');
    els.save = document.getElementById('np-btn-save');
    els.size = document.getElementById('np-size');
    els.dirtyHint = document.getElementById('np-dirty-hint');
    els.modal = document.getElementById('np-color-modal');
    els.colorPreview = document.getElementById('np-color-preview');
    els.colorHex = document.getElementById('np-color-hex');
    els.colorR = document.getElementById('np-color-r');
    els.colorG = document.getElementById('np-color-g');
    els.colorB = document.getElementById('np-color-b');
    els.palette = document.getElementById('np-color-palette');
    els.plane = document.getElementById('np-color-plane');
    els.cursor = document.getElementById('np-color-cursor');
    els.colorCancel = document.getElementById('np-color-cancel');
    els.colorOk = document.getElementById('np-color-ok');
    els.toast = document.getElementById('np-toast');
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        lang: i18n.lang,
        theme: state.theme,
        surname: state.surname,
        given: state.given,
        font: state.font,
        headColor: state.headColor,
      }));
    } catch (e) { /* file:// 下可能不可用，忽略 */ }
  }

  function setStatus(key, vars, tone) {
    state.status = key ? { key, vars: vars || {}, tone: tone || '' } : null;
    syncStatus();
  }

  function syncStatus() {
    if (!els.status) return;
    if (!state.status) {
      els.status.textContent = '';
      els.status.hidden = true;
      els.status.removeAttribute('data-tone');
      return;
    }
    els.status.hidden = false;
    els.status.textContent = t(state.status.key, state.status.vars);
    if (state.status.tone) els.status.setAttribute('data-tone', state.status.tone);
    else els.status.removeAttribute('data-tone');
  }

  function syncSizeText() {
    if (!els.size) return;
    els.size.textContent = state.previewSize
      ? t('np.size', { w: state.previewSize.w, h: state.previewSize.h })
      : '';
  }

  function syncDirtyHint() {
    if (!els.dirtyHint) return;
    els.dirtyHint.hidden = !(state.lastRender && state.dirty);
  }

  function markDirty() {
    state.dirty = true;
    syncDirtyHint();
  }

  function syncColorButton() {
    const current = parseColor(state.headColor || '#FFFFFF') || '#FFFFFF';
    if (els.colorSwatch) els.colorSwatch.style.background = current;
    if (els.colorName) {
      const hit = PALETTE.find((c) => c.color.toUpperCase() === current.toUpperCase());
      els.colorName.textContent = hit ? colorLabel(hit.id) : current;
    }
  }

  function updateActions() {
    const fontsReady = state.fonts.length > 0;
    const canUse = state.ready && fontsReady && !state.busy;
    els.generate.disabled = !canUse;
    els.generate.textContent = state.busy ? t('np.rendering') : t('np.generate');
    els.copy.disabled = !canUse;
    els.save.disabled = !canUse;
    if (fontDrop) fontDrop.setDisabled(state.busy || !fontsReady);
  }

  function buildFontSelect() {
    if (!fontDrop) return;
    if (!state.fonts.length) {
      fontDrop.setOptions([], state.ready ? t('np.fonts_empty') : t('np.font_loading'));
      fontDrop.setDisabled(true);
      return;
    }
    if (state.fonts.indexOf(state.font) < 0) state.font = state.fonts[0];
    fontDrop.setOptions(
      state.fonts.map((id) => ({ value: id, label: fontDef(id).label })),
      t('np.no_font')
    );
    fontDrop.setValue(state.font, true);
    fontDrop.setDisabled(state.busy);
  }

  function buildDropdowns() {
    langDrop = createDropdown({
      options: [
        { value: 'zh_CN', label: '中文' },
        { value: 'ja_JP', label: '日本語' },
        { value: 'en_US', label: 'English' },
      ],
      value: i18n.lang,
      placeholder: i18n.lang,
      className: 'dd-lang',
      menuClass: 'dd-menu-right',
      ariaLabel: t('np.lang_label'),
      onChange: (value) => setLanguage(value),
    });
    els.langSlot.appendChild(langDrop.el);

    fontDrop = createDropdown({
      options: [],
      value: state.font,
      placeholder: t('np.font_loading'),
      className: 'dd-font',
      ariaLabel: t('np.font'),
      onChange: (value) => {
        state.font = value;
        savePrefs();
        markDirty();
      },
    });
    els.fontSlot.appendChild(fontDrop.el);
    buildFontSelect();
  }

  let toastTimer = 0;
  function toast(message, kind) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.className = 'toast';
    }, 2800);
  }

  function applyTranslations() {
    i18n.apply(document);
    document.title = t('np.page_title');
    document.documentElement.lang = i18n.htmlLang;
    if (els.img) els.img.alt = t('np.preview_alt');
  }

  /** 按当前语言切换游戏标题图；没有对应图片时回退为文字标题 */
  function syncGameTitle() {
    if (!els.gameLogo || !els.gameTitle) return;
    const src = gameLogoFor(i18n.lang);
    const alt = t('np.game_title');
    els.gameTitle.textContent = alt;
    els.gameLogo.alt = alt;

    if (!src) {
      els.gameLogo.hidden = true;
      els.gameLogo.removeAttribute('src');
      els.gameTitle.hidden = false;
      return;
    }

    const showLogo = () => {
      els.gameLogo.hidden = false;
      els.gameTitle.hidden = true;
    };
    const showText = () => {
      els.gameLogo.hidden = true;
      els.gameTitle.hidden = false;
    };

    if (els.gameLogo.getAttribute('src') === src && els.gameLogo.complete) {
      if (els.gameLogo.naturalWidth > 0) showLogo();
      else showText();
      return;
    }

    els.gameLogo.onload = showLogo;
    els.gameLogo.onerror = showText;
    els.gameLogo.hidden = true;
    els.gameTitle.hidden = false;
    els.gameLogo.src = src;
  }

  function updateThemeButton() {
    if (!els.themeBtn) return;
    const isLight = state.theme === 'light';
    const label = t(isLight ? 'np.theme_dark' : 'np.theme_light');
    els.themeBtn.title = label;
    els.themeBtn.setAttribute('aria-label', label);
  }

  function setTheme(theme) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    updateThemeButton();
    savePrefs();
  }

  function setLanguage(lang) {
    if (i18n.languages.indexOf(lang) < 0) return;
    i18n.setLang(lang);
    if (langDrop) {
      langDrop.setValue(lang, true);
      langDrop.setAriaLabel(t('np.lang_label'));
    }
    if (fontDrop) fontDrop.setAriaLabel(t('np.font'));
    applyTranslations();
    syncGameTitle();
    updateThemeButton();
    buildPalette();
    buildFontSelect();
    syncColorButton();
    syncStatus();
    if (state.busy) els.size.textContent = t('np.rendering');
    else syncSizeText();
    updateActions();
    savePrefs();
  }

  // ═════════════ 颜色模态 ═════════════

  function buildPalette() {
    els.palette.innerHTML = '';
    PALETTE.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'np-color-item';
      btn.dataset.color = item.color;
      btn.dataset.id = item.id;
      btn.title = colorLabel(item.id);
      const swatch = document.createElement('span');
      swatch.className = 'np-swatch';
      swatch.style.background = item.color;
      btn.appendChild(swatch);
      els.palette.appendChild(btn);
    });
    updatePaletteSelection(modal.current);
  }

  function updatePaletteSelection(color) {
    const current = String(color || '').toUpperCase();
    els.palette.querySelectorAll('.np-color-item').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.color.toUpperCase() === current);
    });
  }

  function syncRgbInputs() {
    const c = hexToRgb(modal.current);
    els.colorR.value = String(c.r);
    els.colorG.value = String(c.g);
    els.colorB.value = String(c.b);
  }

  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  function moveColorCursor(xy) {
    let x;
    let y;
    if (xy) {
      x = clamp01(xy.x);
      y = clamp01(xy.y);
    } else {
      const hsl = hexToHsl(modal.current);
      x = clamp01(hsl.h / 360);
      y = hsl.l >= 50 ? (100 - hsl.l) / 100 : 1 - hsl.l / 100;
    }
    els.cursor.style.left = (x * 100).toFixed(2) + '%';
    els.cursor.style.top = (y * 100).toFixed(2) + '%';
  }

  /** keep: '' = 全部回写；'hex' = 不回写 hex 输入框；'rgb' = 不回写 R/G/B 输入框 */
  function applyColor(color, keep, xy) {
    const next = String(color || '#FFFFFF').toUpperCase();
    modal.current = next;
    els.colorPreview.style.background = next;
    if (keep !== 'hex') els.colorHex.value = next;
    if (keep !== 'rgb') syncRgbInputs();
    updatePaletteSelection(next);
    moveColorCursor(xy);
  }

  function openColorModal() {
    if (modal.open) return;
    modal.open = true;
    clearTimeout(modalHideTimer);
    modal.previousFocus = document.activeElement;
    const start = parseColor(state.headColor || '#FFFFFF') || '#FFFFFF';
    els.plane.style.backgroundImage = planeBackgroundCss();
    applyColor(start, '');
    els.modal.hidden = false;
    void els.modal.offsetWidth;   // 先应用 opacity:0，再切到 open 触发过渡
    els.modal.classList.add('open');
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onModalKeydown);
    setTimeout(() => els.colorHex.focus(), 30);
  }

  function closeColorModal(commit) {
    if (!modal.open) return;
    if (commit) {
      state.headColor = modal.current.toUpperCase() === '#FFFFFF' ? '' : modal.current;
      syncColorButton();
      savePrefs();
      markDirty();
    }
    modal.open = false;
    els.modal.classList.remove('open');
    document.removeEventListener('keydown', onModalKeydown);
    if (modal.previousFocus && typeof modal.previousFocus.focus === 'function') {
      modal.previousFocus.focus();
    }
    clearTimeout(modalHideTimer);
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    modalHideTimer = setTimeout(() => {
      if (modal.open) return;
      els.modal.hidden = true;
      document.body.classList.remove('modal-open');
    }, reduced ? 0 : 240);
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeColorModal(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = els.modal.querySelectorAll(
      'button, input, select, a[href], [tabindex]:not([tabindex="-1"])'
    );
    const focusable = Array.from(nodes).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function bindColorModal() {
    els.colorBtn.addEventListener('click', openColorModal);
    els.colorCancel.addEventListener('click', () => closeColorModal(false));
    els.colorOk.addEventListener('click', () => closeColorModal(true));

    els.palette.addEventListener('click', (e) => {
      const item = e.target.closest('.np-color-item');
      if (item) applyColor(item.dataset.color, '');
    });

    const pick = (e) => {
      const rect = els.plane.getBoundingClientRect();
      const w = els.plane.clientWidth;
      const h = els.plane.clientHeight;
      if (!w || !h) return;
      const x = (e.clientX - rect.left - els.plane.clientLeft) / w;
      const y = (e.clientY - rect.top - els.plane.clientTop) / h;
      applyColor(planeColorAt(x, y), '', { x, y });
    };

    els.plane.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { els.plane.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pick(e);
    });
    els.plane.addEventListener('pointermove', (e) => {
      let captured = false;
      try { captured = els.plane.hasPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (captured) pick(e);
    });

    els.colorHex.addEventListener('input', () => {
      const value = parseColor(els.colorHex.value);
      if (value) applyColor(value, 'hex');
    });

    const onRgbInput = () => {
      const parts = [els.colorR.value, els.colorG.value, els.colorB.value].map((s) => s.trim());
      if (!parts.every((s) => /^\d{1,3}$/.test(s))) return;
      const n = parts.map(Number);
      if (n.some((v) => v > 255)) return;
      applyColor(rgbToHex(n[0], n[1], n[2]), 'rgb');
    };
    [els.colorR, els.colorG, els.colorB].forEach((input) => {
      input.addEventListener('input', onRgbInput);
      input.addEventListener('blur', syncRgbInputs);
    });
  }

  // ═════════════ 生成 / 保存 ═════════════

  async function generate() {
    if (!state.ready || state.busy) return;
    state.busy = true;
    updateActions();
    els.size.textContent = t('np.rendering');
    await delay(16);

    try {
      const canvas = renderCanvas({
        surname: state.surname,
        given: state.given,
        font: state.font,
        headColor: state.headColor,
      });
      state.previewSize = { w: canvas.width, h: canvas.height };
      state.lastRender = {
        canvas,
        surname: String(state.surname || '').trim(),
        given: String(state.given || '').trim(),
        width: canvas.width,
        height: canvas.height,
      };
      els.img.src = canvas.toDataURL('image/png');
      els.img.hidden = false;
      els.stageEmpty.hidden = true;
      state.dirty = false;
      syncDirtyHint();
      syncSizeText();
    } catch (e) {
      console.error('[nameplate] render failed', e);
      state.previewSize = null;
      syncSizeText();
      toast(t('np.render_failed', { msg: (e && e.message) || String(e) }), 'error');
    } finally {
      state.busy = false;
      updateActions();
    }
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('toBlob returned null'));
      }, 'image/png');
    });
  }

  async function savePng() {
    if (!state.lastRender) {
      toast(t('np.nothing_to_save'), 'warning');
      return;
    }
    try {
      const blob = await canvasToBlob(state.lastRender.canvas);
      const name = safeName(state.lastRender.surname + state.lastRender.given) + '.png';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast(t('np.saved') + ' · ' + name, 'success');
    } catch (e) {
      toast(t('np.save_failed', { msg: (e && e.message) || String(e) }), 'error');
    }
  }

  function legacyCopyPreviewImage() {
    if (!els.img || els.img.hidden) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNode(els.img);
    selection.removeAllRanges();
    selection.addRange(range);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    selection.removeAllRanges();
    return ok;
  }

  async function copyPng() {
    if (!state.lastRender) {
      toast(t('np.nothing_to_save'), 'warning');
      return;
    }

    const canvas = state.lastRender.canvas;
    const fallback = (message, kind) => {
      if (legacyCopyPreviewImage()) {
        toast(t('np.copied'), 'success');
      } else {
        toast(message || t('np.copy_unsupported'), kind || 'warning');
      }
    };

    if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function'
        || typeof ClipboardItem === 'undefined') {
      fallback(t('np.copy_unsupported'), 'warning');
      return;
    }

    let item = null;
    try {
      item = new ClipboardItem({ 'image/png': canvasToBlob(canvas) });
    } catch (e) {
      fallback(t('np.copy_failed', { msg: (e && e.message) || String(e) }), 'error');
      return;
    }

    try {
      await navigator.clipboard.write([item]);
      toast(t('np.copied'), 'success');
    } catch (e) {
      fallback(t('np.copy_failed', { msg: (e && e.message) || String(e) }), 'error');
    }
  }

  // ═════════════ 资源加载 ═════════════

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(src));
      img.src = src;
    });
  }

  async function loadFont(def) {
    try {
      if (loadedFaces.has(def.id)) return true;
      if (typeof FontFace === 'undefined') throw new Error('FontFace API unavailable');
      const face = new FontFace(def.family, 'url("' + def.file + '")', {
        style: 'normal',
        weight: '400',
        display: 'block',
      });
      await face.load();
      document.fonts.add(face);
      await document.fonts.load(fontSpec(def, CONFIG.fontSize));
      loadedFaces.add(def.id);
      return true;
    } catch (e) {
      console.warn('[nameplate] font load failed:', def.id, e);
      return false;
    }
  }

  async function bootstrap() {
    setStatus('np.loading_assets');

    const results = await Promise.all(CONFIG.fonts.map(async (def) => ({
      id: def.id,
      ok: await loadFont(def),
    })));
    state.fonts = results.filter((r) => r.ok).map((r) => r.id);

    let baseError = null;
    try {
      state.baseImg = await loadImage(CONFIG.baseImage);
    } catch (e) {
      baseError = e;
    }

    state.ready = !!state.baseImg && state.fonts.length > 0;
    buildFontSelect();

    if (baseError) {
      setStatus('np.base_failed', { msg: baseError.message }, 'error');
    } else if (!state.fonts.length) {
      setStatus('np.fonts_failed', null, 'error');
    } else {
      setStatus(null);
    }
    updateActions();
  }

  // ═════════════ 初始化 ═════════════

  function restorePrefs() {
    const prefs = loadPrefs();
    if (typeof prefs.surname === 'string') state.surname = prefs.surname.slice(0, 16);
    if (typeof prefs.given === 'string') state.given = prefs.given.slice(0, 16);
    if (typeof prefs.font === 'string') state.font = prefs.font;
    if (typeof prefs.headColor === 'string') {
      state.headColor = parseColor(prefs.headColor) || '';
    }
    els.surname.value = state.surname;
    els.given.value = state.given;
  }

  function bindEvents() {
    els.themeBtn.addEventListener('click', () => {
      setTheme(state.theme === 'light' ? 'dark' : 'light');
    });

    const onTextInput = (input, key) => {
      input.addEventListener('input', () => {
        state[key] = input.value;
        savePrefs();
        markDirty();
      });
    };
    onTextInput(els.surname, 'surname');
    onTextInput(els.given, 'given');

    els.generate.addEventListener('click', generate);
    els.copy.addEventListener('click', copyPng);
    els.save.addEventListener('click', savePng);

    document.querySelector('.np-form').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generate();
      }
    });
  }

  function init() {
    cacheElements();

    const prefs = loadPrefs();
    state.theme = prefs.theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    const lang = i18n.languages.indexOf(prefs.lang) >= 0 ? prefs.lang : i18n.detect();
    i18n.setLang(lang);

    restorePrefs();
    applyTranslations();
    syncGameTitle();
    updateThemeButton();
    buildPalette();
    buildDropdowns();
    syncColorButton();
    updateActions();
    bindEvents();
    bindColorModal();

    bootstrap().catch((e) => {
      console.error('[nameplate] bootstrap failed', e);
      setStatus('np.fonts_failed', null, 'error');
    });
  }

  // 供嵌入 / 自动化测试使用的轻量 API
  window.NameplateMaker = Object.freeze({
    version: '1.0.0',
    ready: () => state.ready,
    render: (params) => renderCanvas(params || {}),
    generate,
    copy: copyPng,
    save: savePng,
    getCanvas: () => (state.lastRender ? state.lastRender.canvas : null),
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
