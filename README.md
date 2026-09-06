# ⬛ terminal.portfolio

> A minimalist, interactive, terminal-themed personal portfolio.
> JSON-config-driven. Zero dependencies. Instant GitHub Pages deploy.

```
visitor@soultwilr.dev ❯ █
```

---

## ✦ Features

| Feature | Detail |
|---|---|
| **Pure Vanilla** | HTML + CSS + JS — no frameworks, no build tools |
| **JSON-driven** | All content lives in `config.json` — swap in your data without touching code |
| **5 Color Themes** | Phosphor · Amber · Synthwave · Matrix · Ice |
| **CRT Effects** | Scanlines · Film grain noise · Subtle flicker animation |
| **Typewriter Engine** | Variable-speed character-by-character output |
| **Tab Autocomplete** | Type a prefix, hit Tab |
| **Command History** | ↑ / ↓ arrows navigate history (last 100 commands) |
| **Matrix Rain** | Full-screen Katakana/digit rain, theme-aware color |
| **Boot Sequence** | Simulated BIOS / kernel boot on load |
| **Responsive** | Works on mobile — shrinks gracefully |
| **Accessible** | `aria-live` output, keyboard-only navigable |

---

## ✦ Available Commands

```
help        — show command list
about       — who am I?
skills      — tech stack
projects    — featured work
experience  — work history
contact     — how to reach me
social      — links
pgp         — public PGP key
theme       — cycle color themes
matrix      — 🐇 you know what this does
sudo        — try your luck
clear       — clear the terminal (also Ctrl+L)
```

### Easter Eggs
Try: `ls`, `vim`, `nano`, `whoami`, `pwd`, `date`, `uname -a`, `uptime`, `cat .secrets`, `hack`, `exit`

---

## ✦ Customization

**All content is in [`config.json`](config.json).** Edit that file only.

### Structure

```json
{
  "user": { "name", "title", "location", "email", "available" },
  "theme": { "primary", "secondary", "accent", "bg", "scanlines", "crt_flicker", ... },
  "ascii_art": [ "line1", "line2", ... ],
  "prompt": { "user", "host", "symbol" },
  "boot_messages": [ { "text", "delay" }, ... ],
  "commands": {
    "about": { "description": "...", "output": ["line1", "line2"] },
    "projects": { ... },
    ...
  },
  "easter_eggs": {
    "ls": ["drwxr-xr-x  about/", ...],
    "date": ["_DYNAMIC_DATE_"],
    "uptime": ["_DYNAMIC_UPTIME_"]
  }
}
```

### Add a Custom Command

```json
"config.json" → "commands":
{
  "music": {
    "description": "what I'm listening to",
    "output": [
      "Current track: Burial — Archangel",
      "Genre: UK Garage / Dubstep",
      "Mood: 2am focus"
    ]
  }
}
```

### Change Theme Colors

Edit the `theme` object in `config.json` — or add `"name": "amber"` to auto-apply a preset theme on load.

---

## ✦ Deploy to GitHub Pages

### Automatic (recommended)

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source → GitHub Actions**
3. The `.github/workflows/deploy.yml` file handles everything
4. Done — live at `https://<username>.github.io/<repo>/`

### Manual

```bash
# Just push to main — no build step needed
git add .
git commit -m "feat: launch portfolio"
git push origin main
```

### Local Preview

```bash
# Python (any directory)
python -m http.server 8080

# Node (if you have it)
npx serve .

# Then open http://localhost:8080
```

> ⚠️ **Important:** Open via `http://` not `file://` — the browser blocks `fetch()` on local file URLs.

---

## ✦ File Structure

```
.
├── index.html      ← shell (no content, just structure)
├── style.css       ← all styles, themes, CRT effects
├── terminal.js     ← complete terminal engine
├── config.json     ← ALL your content lives here
├── .github/
│   └── workflows/
│       └── deploy.yml
└── README.md
```

---

*Built with ♥ and approximately too much CSS.*

