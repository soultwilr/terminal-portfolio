/**
 * terminal.js — The complete terminal engine.
 * Reads config.json, handles commands, rendering, themes,
 * matrix rain, history, tab-complete, and all the magic.
 *
 * Zero dependencies. Pure vanilla JS.
 */

'use strict';

/* ══════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════ */
const state = {
  config: null,
  history: [],
  historyIndex: -1,
  currentInput: '',
  isTyping: false,
  matrixActive: false,
  matrixAnimId: null,
  currentTheme: 'phosphor',
  bootDone: false,
  startTime: Date.now(),

  // Themes in order (for cycle)
  themeList: ['phosphor', 'amber', 'synthwave', 'matrix', 'ice'],
};

/* ══════════════════════════════════════════════════════════
   DOM REFS
══════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const dom = {
  output:      $('output-area'),
  inputLine:   $('input-line'),
  input:       $('cmd-input'),
  fakeCursor:  $('fake-cursor'),
  prompt:      $('prompt-display'),
  body:        $('terminal-body'),
  chromeTitle: $('chrome-title'),
  statusMode:  $('status-mode'),
  statusUser:  $('status-user'),
  statusTheme: $('status-theme'),
  statusTime:  $('status-time'),
  themePicker: $('theme-picker'),
  matrixCanvas:$('matrix-canvas'),
  statusBar:   $('status-bar'),
};

/* ══════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */

/** Sleep for `ms` milliseconds */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Escape HTML special chars */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Scroll terminal to the bottom */
function scrollBottom() {
  dom.body.scrollTop = dom.body.scrollHeight;
}

/** Update the fake cursor position to sit right after the text */
function updateCursorPos() {
  // The cursor is an absolutely-positioned child of .input-field-wrap
  // We measure the input's text width using a canvas
  const canvas = updateCursorPos._canvas ??= document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const style  = getComputedStyle(dom.input);
  ctx.font     = `${style.fontSize} ${style.fontFamily}`;
  const w      = ctx.measureText(dom.input.value).width;
  dom.fakeCursor.style.left = `${w}px`;
}

/* ══════════════════════════════════════════════════════════
   OUTPUT RENDERING
══════════════════════════════════════════════════════════ */

/**
 * Append a block of output lines to the terminal.
 * @param {string[]} lines   Array of text lines
 * @param {object}   opts    { typewriter, delay, colorFn }
 */
async function printLines(lines, opts = {}) {
  const { typewriter = false, delay = 0, colorFn = null } = opts;

  const block = document.createElement('div');
  block.className = 'output-block';
  dom.output.appendChild(block);

  for (let i = 0; i < lines.length; i++) {
    const raw  = lines[i];
    const span = document.createElement('span');
    span.className = 'output-line ' + (colorFn ? colorFn(raw, i) : classifyLine(raw));

    if (typewriter && raw.trim().length > 0) {
      span.textContent = '';
      block.appendChild(span);
      scrollBottom();
      await typewriteLine(span, raw);
    } else {
      span.innerHTML = escHtml(raw);
      block.appendChild(span);
    }

    if (delay > 0) await sleep(delay);
    scrollBottom();
  }

  return block;
}

/** Infer a CSS class from line content */
function classifyLine(line) {
  if (line.startsWith('  ▸') || line.startsWith('  ►') || line.startsWith('  →'))
    return 'line-secondary';
  if (line.startsWith('╔') || line.startsWith('╚') || line.startsWith('║') ||
      line.startsWith('┌') || line.startsWith('└') || line.startsWith('│') ||
      line.startsWith('├') || line.startsWith('─') || line.startsWith('┤'))
    return 'line-primary';
  if (line.startsWith('-----BEGIN') || line.startsWith('-----END'))
    return 'line-warning';
  if (line.includes('Permission denied') || line.includes('not in the sudoers'))
    return 'line-error';
  if (line.startsWith('[  OK  ]') || line.match(/^  \[0[0-9]\]/))
    return 'line-primary';
  if (line.startsWith('  Tip:') || line.startsWith('  \"') || line.startsWith('  ('))
    return 'line-dim';
  return 'line-text';
}

/** Typewriter effect for a single line */
async function typewriteLine(el, text, speed = 18) {
  for (let i = 0; i <= text.length; i++) {
    el.textContent = text.slice(0, i);
    scrollBottom();
    // Vary speed slightly for natural feel
    const jitter = Math.random() < 0.05 ? speed * 3 : speed;
    await sleep(jitter);
  }
}

/** Print a command echo (the "prompt + command" line) */
function printEcho(promptStr, cmd) {
  const el = document.createElement('div');
  el.className = 'cmd-echo output-block';
  el.innerHTML =
    `<span class="prompt-text">${escHtml(promptStr)}</span>` +
    `<span class="cmd-text">${escHtml(cmd)}</span>`;
  dom.output.appendChild(el);
  scrollBottom();
}

/** Print a single error line */
function printError(msg) {
  const el = document.createElement('div');
  el.className = 'output-block';
  const span = document.createElement('span');
  span.className = 'output-line error-line';
  span.textContent = msg;
  el.appendChild(span);
  dom.output.appendChild(el);
  scrollBottom();
}

/** Print ASCII banner */
async function printBanner() {
  const cfg  = state.config;
  const art  = cfg.ascii_art;
  const tag  = cfg.banner_tagline;

  // ASCII art block
  const block = document.createElement('div');
  block.className = 'output-block';
  const artDiv = document.createElement('pre');
  artDiv.className = 'ascii-block';
  block.appendChild(artDiv);
  dom.output.appendChild(block);

  // Type each line of ASCII art fast
  for (const line of art) {
    const span = document.createElement('span');
    span.className = 'output-line';
    span.textContent = line;
    artDiv.appendChild(span);
    artDiv.appendChild(document.createTextNode('\n'));
    await sleep(40);
    scrollBottom();
  }

  // Tagline
  const tagEl = document.createElement('div');
  tagEl.className = 'output-block';
  const tagSpan = document.createElement('span');
  tagSpan.className = 'output-line tagline-line';
  tagEl.appendChild(tagSpan);
  dom.output.appendChild(tagEl);
  await typewriteLine(tagSpan, `  ─── ${tag} ───`, 28);
  await printLines([''], {});
}

/* ══════════════════════════════════════════════════════════
   BOOT SEQUENCE
══════════════════════════════════════════════════════════ */
async function runBootSequence() {
  const messages = state.config.theme.boot_sequence
    ? state.config.boot_messages
    : [];

  for (const msg of messages) {
    await sleep(msg.delay);
    const isOk = msg.text.startsWith('[  OK  ]');
    const line  = document.createElement('div');
    line.className = 'output-block';
    const span = document.createElement('span');
    span.className = 'output-line ' + (isOk ? 'boot-ok' : 'boot-line');
    span.textContent = msg.text;
    line.appendChild(span);
    dom.output.appendChild(line);
    scrollBottom();
  }

  await sleep(300);
  // Clear boot messages
  dom.output.innerHTML = '';
}

/* ══════════════════════════════════════════════════════════
   COMMAND HANDLING
══════════════════════════════════════════════════════════ */

/** Build prompt string from config — shorter on mobile */
function buildPrompt() {
  const p = state.config.prompt;
  // On narrow screens, drop the host to save space
  if (window.innerWidth <= 480) {
    return `${p.symbol} `;
  }
  return `${p.user}@${p.host} ${p.symbol} `;
}

/** Main command dispatcher */
async function handleCommand(rawInput) {
  const cmd = rawInput.trim().toLowerCase();
  if (!cmd) return;

  const promptStr = buildPrompt();
  printEcho(promptStr, rawInput.trim());

  // Push to history
  if (state.history[0] !== rawInput.trim()) {
    state.history.unshift(rawInput.trim());
    if (state.history.length > 100) state.history.pop();
  }
  state.historyIndex = -1;
  state.currentInput = '';

  // ── Easter eggs first ─────────────────────────────────
  if (cmd in state.config.easter_eggs) {
    const lines = resolveEasterEgg(state.config.easter_eggs[cmd]);
    await printLines(lines, { delay: 0 });
    await printLines([''], {});
    return;
  }

  // ── Special commands ───────────────────────────────────
  if (cmd === 'clear') {
    dom.output.innerHTML = '';
    await printBanner();
    return;
  }

  if (cmd === 'matrix') {
    await handleMatrix();
    return;
  }

  if (cmd === 'theme') {
    handleTheme();
    return;
  }

  // ── Config-driven commands ────────────────────────────
  if (cmd in state.config.commands) {
    const def = state.config.commands[cmd];
    if (cmd === 'clear') {
      dom.output.innerHTML = '';
      await printBanner();
      return;
    }
    await printLines(def.output, { delay: 12 });
    await printLines([''], {});
    return;
  }

  // ── Unknown command ───────────────────────────────────
  printError(`bash: ${escHtml(rawInput.trim())}: command not found`);
  await printLines(["  (Type 'help' to see available commands)"], {});
  await printLines([''], {});
}

/** Resolve dynamic easter egg values */
function resolveEasterEgg(lines) {
  return lines.map(l => {
    if (l === '_DYNAMIC_DATE_') {
      return '  ' + new Date().toString();
    }
    if (l === '_DYNAMIC_UPTIME_') {
      const secs = Math.floor((Date.now() - state.startTime) / 1000);
      const m    = Math.floor(secs / 60);
      const s    = secs % 60;
      return `  up ${m}m ${s}s, 1 user, load average: 0.42, 0.13, 0.05`;
    }
    return l;
  });
}

/* ── Theme Command ──────────────────────────────────────── */
function handleTheme() {
  const picker = dom.themePicker;
  const isVis  = picker.classList.contains('visible');

  if (isVis) {
    picker.classList.remove('visible');
    picker.setAttribute('aria-hidden', 'true');
  } else {
    picker.classList.add('visible');
    picker.removeAttribute('aria-hidden');
    // Print the theme cycling output
    const def = state.config.commands.theme;
    printLines(def.output, { delay: 0 });
    printLines([''], {});
  }
}

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name === 'phosphor' ? '' : name);
  if (name === 'phosphor') {
    document.documentElement.removeAttribute('data-theme');
  }
  state.currentTheme = name;
  dom.statusTheme.textContent = `THEME: ${name}`;

  // Update active button
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === name);
  });

  // Re-color ASCII art glow
  scrollBottom();
}

/* ── Matrix Easter Egg ──────────────────────────────────── */
async function handleMatrix() {
  if (state.matrixActive) {
    // Stop matrix
    cancelAnimationFrame(state.matrixAnimId);
    state.matrixActive = false;
    dom.matrixCanvas.classList.remove('active');
    dom.statusMode.textContent = 'NORMAL';
    await printLines(['Matrix mode deactivated. Welcome back.', ''], {});
    return;
  }

  await printLines([
    '░░░ ENTERING THE MATRIX ░░░',
    '',
    '  "There is no spoon."',
    '',
    '  Click anywhere or type \'matrix\' again to exit.',
    '',
  ], { delay: 60 });

  state.matrixActive = true;
  dom.matrixCanvas.classList.add('active');
  dom.statusMode.textContent = 'MATRIX';

  startMatrixRain();
}

function startMatrixRain() {
  const canvas = dom.matrixCanvas;
  const ctx    = canvas.getContext('2d');
  const W = canvas.width  = window.innerWidth;
  const H = canvas.height = window.innerHeight;

  const fontSize = 14;
  const cols     = Math.floor(W / fontSize);
  const drops    = new Array(cols).fill(1);

  // Characters (katakana + digits for extra style)
  const chars =
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨ' +
    'ラリルレロワヲン0123456789ABCDEF!@#$%^&*<>';

  const themeColors = {
    phosphor:  '#00ff9f',
    amber:     '#ffb700',
    synthwave: '#ff00ff',
    matrix:    '#00ff41',
    ice:       '#00cfff',
  };

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, W, H);

    const color = themeColors[state.currentTheme] ?? '#00ff9f';
    ctx.fillStyle = color;
    ctx.font      = `${fontSize}px 'Courier New', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = drops[i] < 3 ? '#ffffff' : color;
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > H && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    state.matrixAnimId = requestAnimationFrame(draw);
  }

  draw();
}

/* ── Tab Autocomplete ───────────────────────────────────── */
function handleTab(e) {
  e.preventDefault();
  const val      = dom.input.value.toLowerCase().trim();
  if (!val) return;

  const allCmds  = [
    ...Object.keys(state.config.commands),
    ...Object.keys(state.config.easter_eggs),
  ];

  const matches = allCmds.filter(c => c.startsWith(val));

  if (matches.length === 1) {
    dom.input.value = matches[0];
    updateCursorPos();
  } else if (matches.length > 1) {
    // Show matches as a hint
    const hintEl = document.createElement('div');
    hintEl.className = 'output-block';
    hintEl.innerHTML =
      `<span class="output-line line-muted">${matches.join('   ')}</span>`;
    dom.output.appendChild(hintEl);
    scrollBottom();
  }
}

/* ── History Navigation ─────────────────────────────────── */
function handleHistory(dir) {
  if (!state.history.length) return;

  if (state.historyIndex === -1 && dir === -1) return;

  if (dir === 1) {
    if (state.historyIndex === -1) {
      state.currentInput   = dom.input.value;
    }
    state.historyIndex = Math.min(state.historyIndex + 1, state.history.length - 1);
    dom.input.value = state.history[state.historyIndex];
  } else {
    state.historyIndex--;
    if (state.historyIndex < 0) {
      state.historyIndex = -1;
      dom.input.value = state.currentInput;
    } else {
      dom.input.value = state.history[state.historyIndex];
    }
  }
  updateCursorPos();
}

/* ══════════════════════════════════════════════════════════
   STATUS BAR CLOCK
══════════════════════════════════════════════════════════ */
function startClock() {
  function tick() {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    const ss  = String(now.getSeconds()).padStart(2, '0');
    dom.statusTime.textContent = `${hh}:${mm}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ══════════════════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════════════════ */
function bindEvents() {
  // Submit on Enter
  dom.input.addEventListener('keydown', async e => {
    if (e.key === 'Enter') {
      const val = dom.input.value;
      dom.input.value = '';
      updateCursorPos();
      await handleCommand(val);
    } else if (e.key === 'Tab') {
      handleTab(e);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleHistory(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleHistory(-1);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      dom.output.innerHTML = '';
      await printBanner();
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      // Ctrl+C: cancel current input
      const canceled = dom.input.value;
      dom.input.value = '';
      updateCursorPos();
      if (canceled) {
        printEcho(buildPrompt(), canceled + '^C');
      }
    }
  });

  // Update fake cursor on every input change
  dom.input.addEventListener('input', updateCursorPos);

  // Focus input on click anywhere on terminal
  document.addEventListener('click', () => {
    // Stop matrix on click
    if (state.matrixActive) {
      cancelAnimationFrame(state.matrixAnimId);
      state.matrixActive = false;
      dom.matrixCanvas.classList.remove('active');
      dom.statusMode.textContent = 'NORMAL';
      printLines(['', 'Matrix mode deactivated.', ''], {});
    }
    dom.input.focus();
  });

  // Theme picker buttons
  dom.themePicker.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      applyTheme(btn.dataset.theme);
    });
  });

  // Keyboard shortcut: Esc closes theme picker
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      dom.themePicker.classList.remove('visible');
      dom.input.focus();
    }
  });

  // Resize matrix canvas on window resize, and refresh prompt length
  window.addEventListener('resize', () => {
    if (state.matrixActive) {
      dom.matrixCanvas.width  = window.innerWidth;
      dom.matrixCanvas.height = window.innerHeight;
    }
    // Re-render prompt (short on mobile, full on desktop)
    if (state.config) {
      dom.prompt.textContent = buildPrompt();
    }
  });
}

/* ══════════════════════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════════════════════ */
async function init() {
  // 1. Load config
  try {
    const res = await fetch('./config.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.config = await res.json();
  } catch (err) {
    document.body.innerHTML =
      `<pre style="color:#ff4444;padding:2rem">
FATAL: Failed to load config.json
${err.message}

Make sure config.json is in the same directory as index.html
and you are serving the site over HTTP (not file://).
      </pre>`;
    return;
  }

  // 2. Apply theme from config
  const themeName = state.config.theme?.name ?? 'phosphor';
  if (themeName !== 'phosphor') applyTheme(themeName);

  // 3. Set prompt and chrome title
  const cfg  = state.config;
  const p    = cfg.prompt;
  dom.prompt.textContent = buildPrompt();
  dom.chromeTitle.textContent =
    `${p.user}@${p.host} — ${cfg.user.title ?? 'bash'}`;
  dom.statusUser.textContent = `${p.user}@${p.host}`;

  // 4. Start clock
  startClock();

  // 5. Bind events
  bindEvents();

  // 6. Focus input
  dom.input.focus();

  // 7. Boot sequence
  await runBootSequence();

  // 8. Print ASCII banner
  await printBanner();

  // 9. Auto-run the welcome sequence
  const isMobile = window.innerWidth <= 480;
  await printLines([
    `  Welcome to ${cfg.user.name}'s terminal.`,
    `  ${new Date().toDateString()}`,
    '',
    "  Type 'help' to list commands.",
    isMobile
      ? "  Tab=autocomplete  ↑↓=history"
      : "  Tab autocomplete  ·  ↑↓ history  ·  Ctrl+L clear",
    '',
  ], { delay: 0 });

  state.bootDone = true;
}

// Kick it off
init();

