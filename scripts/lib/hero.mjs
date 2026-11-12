// Hero banner (angle A): intro on the left, a miniature collaborative map editor on the right.
import { esc, n, textWidth, fit, svgDoc, panel, WIDTH } from './theme.mjs';

const HEIGHT = 320;
const PAD = 40; // left content inset
const LEFT_MAX = 470; // width available to the intro column
const CYCLE = 18; // seconds for the full tagline loop (also used by the map scene)

/** Pick the largest tagline font size (<= 15px) at which every tagline fits on one line. */
function taglineSize(taglines) {
  for (let size = 15; size > 12; size -= 0.5) {
    if (taglines.every((t) => textWidth(t, size) <= LEFT_MAX - 16)) return size;
  }
  return 12;
}

/** Soft background: accent glow + faint dot grid, clipped to the card. */
function background(theme) {
  const defs = `
<clipPath id="ha-card"><rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="13"/></clipPath>
<radialGradient id="ha-glow" cx="0.18" cy="0.12" r="0.7">
  <stop offset="0" stop-color="${theme.accent}" stop-opacity="${theme.glow * 0.32}"/>
  <stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ha-glow2" cx="0.85" cy="0.95" r="0.55">
  <stop offset="0" stop-color="${theme.accent2}" stop-opacity="${theme.glow * 0.22}"/>
  <stop offset="1" stop-color="${theme.accent2}" stop-opacity="0"/>
</radialGradient>
<pattern id="ha-dots" width="18" height="18" patternUnits="userSpaceOnUse">
  <circle cx="9" cy="9" r="1" fill="${theme.faint}" fill-opacity="${theme.name === 'dark' ? 0.28 : 0.3}"/>
</pattern>
<linearGradient id="ha-fade" x1="0" x2="1">
  <stop offset="0" stop-color="#fff" stop-opacity="0.15"/>
  <stop offset="0.6" stop-color="#fff" stop-opacity="1"/>
</linearGradient>
<mask id="ha-dotmask"><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ha-fade)"/></mask>`;
  const body = `
${panel(theme, { width: WIDTH, height: HEIGHT })}
<g clip-path="url(#ha-card)">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ha-dots)" mask="url(#ha-dotmask)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ha-glow)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ha-glow2)"/>
</g>`;
  return { defs, body };
}

/** Code-style eyebrow chip: <FrontendEngineer city="Lisbon" /> with light syntax colouring. */
function eyebrow(theme, x, y) {
  const size = 12;
  const parts = [
    ['<', theme.faint], ['FrontendEngineer', theme.accent], [' city', theme.accent2],
    ['=', theme.faint], ['"Lisbon"', theme.accent3], [' />', theme.faint],
  ];
  const full = parts.map((p) => p[0]).join('');
  const w = textWidth(full, size, { mono: true });
  const spans = parts.map(([t, c]) => `<tspan fill="${c}">${esc(t)}</tspan>`).join('');
  return `<g transform="translate(${x} ${y})">
  <rect width="${n(w + 24)}" height="26" rx="13" fill="${theme.accent}" fill-opacity="0.08" stroke="${theme.accent}" stroke-opacity="0.35"/>
  <text x="12" y="17.5" class="mono" font-size="${size}" textLength="${n(w)}">${spans}</text>
</g>`;
}

/** Headline, with the surname in the accent colour. */
function headline(theme, profile, x, y) {
  const [first, ...rest] = profile.name.split(' ');
  const last = rest.join(' ');
  return `<text x="${x}" y="${y}" font-size="46" font-weight="800" letter-spacing="-1" fill="${theme.text}">Hi, I'm ${esc(first)} <tspan fill="${theme.accent}">${esc(last)}</tspan></text>`;
}

/** Role line with a live status dot. */
function roleLine(theme, profile, x, y) {
  const text = fit(`${profile.role} · ${profile.location}`, 16, LEFT_MAX - 20, { weight: 500 });
  return `<circle cx="${x + 5}" cy="${y - 5}" r="4" fill="${theme.accent}"/>
<circle cx="${x + 5}" cy="${y - 5}" r="4" fill="none" stroke="${theme.accent}" class="ha-ping"/>
<text x="${x + 18}" y="${y}" font-size="16" font-weight="500" fill="${theme.muted}">${esc(text)}</text>`;
}
// Phases of one tagline slot, as fractions of the slot: type in, hold, erase, short pause.
const TYPE_END = 0.3;
const HOLD_END = 0.82;
const ERASE_END = 0.9;
const START_AT = 0.4; // t=0 lands mid-hold on the first tagline, so the static frame is complete

/** Keyframe percentage for fraction f inside slot i of count slots. */
const pct = (i, f, count) => `${n(((i + f) / count) * 100)}%`;

/**
 * Typed taglines: each line is revealed by a clip rect scaled with steps() (one step per glyph)
 * and followed by a caret that moves the same way. All lines share one CYCLE-long loop.
 */
function taglines(theme, list, x, y) {
  const size = taglineSize(list);
  const count = list.length;
  const delay = `-${n((START_AT / count) * CYCLE)}s`;
  const tx = x + 18; // text starts after the ">" prompt
  let css = `.ha-caret{animation:ha-blink 1s step-end infinite}@keyframes ha-blink{50%{opacity:0}}`;
  let defs = '';
  let body = '';
  list.forEach((line, i) => {
    const text = fit(line, size, LEFT_MAX - 16);
    const w = textWidth(text, size) + 2;
    const glyphs = [...text].length;
    const p = (f) => pct(i, f, count);
    css += `
@keyframes ha-r${i}{0%{transform:scaleX(0)}${p(0)}{transform:scaleX(0);animation-timing-function:steps(${glyphs})}${p(TYPE_END)},${p(HOLD_END)}{transform:scaleX(1);animation-timing-function:steps(${Math.ceil(glyphs / 3)})}${p(ERASE_END)},100%{transform:scaleX(0)}}
@keyframes ha-c${i}{0%{transform:translateX(0)}${p(0)}{transform:translateX(0);animation-timing-function:steps(${glyphs})}${p(TYPE_END)},${p(HOLD_END)}{transform:translateX(${n(w)}px);animation-timing-function:steps(${Math.ceil(glyphs / 3)})}${p(ERASE_END)},100%{transform:translateX(0)}}
@keyframes ha-v${i}{0%{opacity:0}${p(0)}{opacity:1}${p(ERASE_END + 0.04)}{opacity:0}}
.ha-r${i}{transform-origin:${tx}px 0;animation:ha-r${i} ${CYCLE}s ${delay} infinite}
.ha-l${i}{animation:ha-v${i} ${CYCLE}s ${delay} step-end infinite}
.ha-c${i}{animation:ha-c${i} ${CYCLE}s ${delay} infinite}`;
    // Static fallback (reduced motion): attributes show only the first line, fully typed.
    // Running CSS animations override these presentation attributes.
    const still = i === 0;
    defs += `<clipPath id="ha-tc${i}"><rect class="ha-r${i}" x="${tx}" y="${y - size - 4}" width="${n(w)}" height="${n(size + 10)}"/></clipPath>`;
    body += `<g class="ha-l${i}"${still ? '' : ' opacity="0"'}>
<text x="${tx}" y="${y}" font-size="${size}" fill="${theme.text}" clip-path="url(#ha-tc${i})" textLength="${n(w - 2)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>
<g class="ha-c${i}" transform="translate(${still ? n(w) : 0} 0)"><rect class="ha-caret" x="${tx + 1}" y="${n(y - size + 1)}" width="2" height="${n(size + 3)}" rx="1" fill="${theme.accent}"/></g>
</g>`;
  });
  const prompt = `<text x="${x}" y="${y}" class="mono" font-size="${size}" font-weight="700" fill="${theme.accent}">&gt;</text>`;
  return { css, defs, body: prompt + body };
}

/** Fact tiles: emphasised value over a muted label, left to right; labels are fitted if needed. */
function factChips(theme, facts, x, y) {
  const GAP = 10;
  const PADX = 14;
  const VS = 16; // value size
  const LS = 11; // label size
  const avail = BOX.x - 24 - x;
  const maxLabel = (avail - GAP * (facts.length - 1)) / Math.max(facts.length, 1) - PADX * 2;
  return facts
    .map((f) => {
      const label = fit(f.label, LS, maxLabel);
      const vw = textWidth(f.value, VS, { weight: 700 });
      const lw = textWidth(label, LS);
      return { value: f.value, label, vw, lw, w: Math.max(vw, lw) + PADX * 2 };
    })
    .map((m, i, all) => {
      const left = x + all.slice(0, i).reduce((s, o) => s + o.w + GAP, 0);
      return `<g transform="translate(${n(left)} ${y})">
  <rect width="${n(m.w)}" height="48" rx="10" fill="${theme.panelAlt}" fill-opacity="0.85" stroke="${theme.border}"/>
  <rect x="0.5" y="14" width="2.5" height="20" rx="1.25" fill="${theme.accent}"/>
  <text x="${PADX}" y="22" font-size="${VS}" font-weight="700" letter-spacing="-0.2" fill="${theme.text}" textLength="${n(m.vw)}">${esc(m.value)}</text>
  <text x="${PADX}" y="38" font-size="${LS}" fill="${theme.muted}">${esc(m.label)}</text>
</g>`;
    })
    .join('\n');
}
// ---------------------------------------------------------------------------------------------
// Right side: a miniature real-time collaborative map editor.
// ---------------------------------------------------------------------------------------------

const BOX = { x: 548, y: 24, w: 308, h: 272 }; // editor window
const MAP = { x: BOX.x + 8, y: BOX.y + 40, w: BOX.w - 16, h: BOX.h - 48 }; // map viewport
const MAP_LOOP = 12; // seconds per drawing loop

/** Editor window chrome: file name on the left, avatars + "live" presence pill on the right. */
function editorChrome(theme) {
  const { x, y, w, h } = BOX;
  const file = 'lisbon-zones.geojson';
  const fileW = textWidth(file, 11, { mono: true });
  const liveW = textWidth('LIVE', 11, { mono: true });
  const pillW = liveW + 26;
  const pillX = x + w - 12 - pillW;
  const avX = pillX - 14; // centre of the right-most avatar
  const avatar = (cx, color, letter) =>
    `<circle cx="${cx}" cy="${y + 19}" r="9" fill="${color}" stroke="${theme.panelAlt}" stroke-width="2"/>
<text x="${cx}" y="${y + 23}" font-size="11" font-weight="700" text-anchor="middle" fill="${theme.panel}">${letter}</text>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${theme.panelAlt}" stroke="${theme.border}"/>
<g transform="translate(${x + 14} ${y + 13})" fill="none" stroke="${theme.accent}" stroke-width="1.4" stroke-linejoin="round">
  <path d="M0 2 L4 0 L8 2 L12 0 V10 L8 12 L4 10 L0 12 Z"/><path d="M4 0 V10 M8 2 V12" stroke-opacity="0.6"/>
</g>
<text x="${x + 34}" y="${y + 23}" class="mono" font-size="11" fill="${theme.muted}" textLength="${n(fileW)}">${file}</text>
${avatar(avX - 14, theme.accent2, 'Y')}
${avatar(avX, theme.accent, 'P')}
<g transform="translate(${n(pillX)} ${y + 9})">
  <rect width="${n(pillW)}" height="20" rx="10" fill="${theme.accent}" fill-opacity="0.12" stroke="${theme.accent}" stroke-opacity="0.4"/>
  <circle cx="10" cy="10" r="3" fill="${theme.accent}"/>
  <circle cx="10" cy="10" r="3" fill="none" stroke="${theme.accent}" class="ha-ping"/>
  <text x="18" y="14" class="mono" font-size="11" font-weight="700" letter-spacing="0" fill="${theme.accent}" textLength="${n(liveW)}">LIVE</text>
</g>`;
}

/** Soft terrain inside the map viewport (local coordinates 0..MAP.w x 0..MAP.h). */
function terrain(theme) {
  const { w, h } = MAP;
  const grid = [];
  for (let gx = 24; gx < w; gx += 24) grid.push(`M${gx} 0V${h}`);
  for (let gy = 24; gy < h; gy += 24) grid.push(`M0 ${gy}H${w}`);
  const dark = theme.name === 'dark';
  return `<rect width="${w}" height="${h}" fill="${theme.panel}"/>
<path d="${grid.join('')}" stroke="${theme.border}" stroke-opacity="${dark ? 0.55 : 0.45}" stroke-width="1"/>
<g fill="${theme.accent}" fill-opacity="${dark ? 0.07 : 0.08}">
  <path d="M8 6 h56 a10 10 0 0 1 10 10 v20 a10 10 0 0 1 -10 10 h-56 z"/>
  <path d="M236 168 c18-8 44-4 56 6 v52 h-70 c-6-20-2-48 14-58z"/>
</g>
<g fill="none" stroke="${theme.faint}" stroke-opacity="0.35" stroke-dasharray="2 4">
  <ellipse cx="248" cy="40" rx="34" ry="20"/><ellipse cx="248" cy="40" rx="18" ry="10"/>
</g>
<path d="M-6 196 C50 168 90 214 150 196 S240 150 300 166" fill="none" stroke="${theme.accent2}" stroke-opacity="${dark ? 0.22 : 0.18}" stroke-width="14" stroke-linecap="round"/>
<path d="M-6 196 C50 168 90 214 150 196 S240 150 300 166" fill="none" stroke="${theme.accent2}" stroke-opacity="0.35" stroke-width="1.2"/>
<g fill="none" stroke="${theme.muted}" stroke-opacity="${dark ? 0.35 : 0.3}" stroke-linecap="round">
  <path d="M0 98 C70 92 120 112 292 86" stroke-width="3"/>
  <path d="M106 0 C112 60 96 130 120 226" stroke-width="2"/>
</g>
<g transform="translate(10 ${h - 14})">
  <path d="M0 0 v4 h40 v-4" fill="none" stroke="${theme.muted}" stroke-width="1.2"/>
  <text x="46" y="5" class="mono" font-size="11" fill="${theme.muted}">200 m</text>
</g>
<g transform="translate(${w - 30} 8)" fill="${theme.panelAlt}" stroke="${theme.border}">
  <rect width="22" height="44" rx="6"/><path d="M0 22 H22" fill="none"/>
  <path d="M7 11 H15 M11 7 V15 M7 33 H15" stroke="${theme.muted}" stroke-width="1.4" stroke-linecap="round"/>
</g>`;
}
// Polygon vertices (map-local) and who places them. Pedro draws the first half, "You" closes it.
const POLY = [[48, 60], [140, 34], [220, 70], [226, 140], [146, 168], [60, 138]];
const REST = { pedro: [16, 12], you: [196, 184] };
// Loop timeline as fractions of MAP_LOOP. Each cursor visits its waypoints at these times;
// the edge into a vertex is drawn over exactly the interval the cursor travels it.
const PEDRO_PATH = [[0, REST.pedro], [0.04, REST.pedro], [0.1, POLY[0]], [0.18, POLY[1]], [0.26, POLY[2]], [0.34, POLY[3]], [0.46, REST.pedro], [1, REST.pedro]];
const YOU_PATH = [[0, REST.you], [0.28, REST.you], [0.37, POLY[3]], [0.45, POLY[4]], [0.53, POLY[5]], [0.61, POLY[0]], [0.72, REST.you], [1, REST.you]];
const EDGES = [ // [from, to, start, end, author]
  [0, 1, 0.1, 0.18, 'pedro'], [1, 2, 0.18, 0.26, 'pedro'], [2, 3, 0.26, 0.34, 'pedro'],
  [3, 4, 0.37, 0.45, 'you'], [4, 5, 0.45, 0.53, 'you'], [5, 0, 0.53, 0.61, 'you'],
];
const VERTEX_AT = [[0.1, 'pedro'], [0.18, 'pedro'], [0.26, 'pedro'], [0.34, 'pedro'], [0.45, 'you'], [0.53, 'you']];
const CLOSE_AT = 0.61;
const FADE = [0.9, 0.96]; // finished shape fades out, then the loop restarts empty
const MAP_START = 0.8; // t=0 shows the finished, labelled polygon (static frame is complete)

const P = (f) => `${n(f * 100)}%`;
/** Build an @keyframes rule from [fraction, declarations] stops. */
const keyframes = (name, stops) => `@keyframes ${name}{${stops.map(([f, d]) => `${P(f)}{${d}}`).join('')}}`;
const anim = (name, extra = '') => `animation:${name} ${MAP_LOOP}s -${n(MAP_START * MAP_LOOP)}s infinite ${extra}`;

/** Multiplayer cursor: arrow + name tag, moved along its waypoints with CSS keyframes. */
function cursor(theme, id, label, color, path) {
  const tw = textWidth(label, 11, { weight: 700 });
  const css = `${keyframes(`ha-m-${id}`, path.map(([f, [x, y]]) => [f, `transform:translate(${x}px,${y}px)`]))}
.ha-m-${id}{${anim(`ha-m-${id}`)};animation-timing-function:cubic-bezier(.45,0,.3,1)}`;
  const [rx, ry] = path[0][1];
  const body = `<g class="ha-m-${id}" transform="translate(${rx} ${ry})">
  <path d="M0 0 L0 15 L4 11.4 L7 18 L9.6 16.9 L6.7 10.5 L12 10.5 Z" fill="${color}" stroke="${theme.panel}" stroke-width="1.3" stroke-linejoin="round"/>
  <rect x="11" y="15" width="${n(tw + 14)}" height="18" rx="9" fill="${color}"/>
  <text x="18" y="27.8" font-size="11" font-weight="700" fill="${theme.panel}" textLength="${n(tw)}">${esc(label)}</text>
</g>`;
  return { css, body };
}

/** The polygon: edges drawn stroke by stroke, vertices popping in, then fill + area label. */
function polygon(theme) {
  const color = (who) => (who === 'pedro' ? theme.accent : theme.accent2);
  let css = `${keyframes('ha-shape', [[0, 'opacity:1'], [FADE[0], 'opacity:1'], [FADE[1], 'opacity:0'], [1, 'opacity:0']])}
.ha-shape{${anim('ha-shape')}}`;
  const pts = POLY.map((p) => p.join(',')).join(' ');
  css += `${keyframes('ha-fill', [[0, 'opacity:0'], [CLOSE_AT, 'opacity:0'], [CLOSE_AT + 0.05, 'opacity:1'], [1, 'opacity:1']])}
.ha-fill{${anim('ha-fill')}}`;
  let body = `<g class="ha-shape"><polygon class="ha-fill" points="${pts}" fill="${theme.accent}" fill-opacity="${theme.name === 'dark' ? 0.14 : 0.12}"/>`;
  EDGES.forEach(([a, b, s, e, who], i) => {
    const [x1, y1] = POLY[a];
    const [x2, y2] = POLY[b];
    css += `${keyframes(`ha-e${i}`, [[0, 'stroke-dashoffset:1'], [s, 'stroke-dashoffset:1;animation-timing-function:cubic-bezier(.45,0,.3,1)'], [e, 'stroke-dashoffset:0'], [1, 'stroke-dashoffset:0']])}
.ha-e${i}{${anim(`ha-e${i}`)}}`;
    body += `<path class="ha-e${i}" d="M${x1} ${y1}L${x2} ${y2}" pathLength="1" stroke-dasharray="1 1" stroke="${color(who)}" stroke-width="2.2" stroke-linecap="round"/>`;
  });
  VERTEX_AT.forEach(([f, who], i) => {
    const [x, y] = POLY[i];
    css += `${keyframes(`ha-v${i}p`, [[0, 'transform:scale(0)'], [f, 'transform:scale(0)'], [f + 0.015, 'transform:scale(1.5)'], [f + 0.035, 'transform:scale(1)'], [1, 'transform:scale(1)']])}
.ha-v${i}p{transform-box:fill-box;transform-origin:center;${anim(`ha-v${i}p`)}}`;
    body += `<circle class="ha-v${i}p" cx="${x}" cy="${y}" r="4.5" fill="${theme.panel}" stroke="${color(who)}" stroke-width="2"/>`;
  });
  body += `${areaLabel(theme)}</g>`;
  return { css, body };
}
/** Small "area" tag that pops in at the polygon centroid once the shape is closed. */
function areaLabel(theme) {
  const cx = POLY.reduce((s, p) => s + p[0], 0) / POLY.length;
  const cy = POLY.reduce((s, p) => s + p[1], 0) / POLY.length;
  const text = 'Zone A · 1.4 km²';
  const tw = textWidth(text, 11, { weight: 600 });
  const w = tw + 28;
  const at = CLOSE_AT + 0.03;
  const css = `${keyframes('ha-area', [[0, 'transform:scale(0);opacity:0'], [at, 'transform:scale(0);opacity:0'], [at + 0.02, 'transform:scale(1.06);opacity:1'], [at + 0.035, 'transform:scale(1);opacity:1'], [1, 'transform:scale(1);opacity:1']])}
.ha-area{transform-box:fill-box;transform-origin:center;${anim('ha-area')}}`;
  return `<style>${css}</style><g class="ha-area">
  <rect x="${n(cx - w / 2)}" y="${n(cy - 11)}" width="${n(w)}" height="22" rx="11" fill="${theme.panel}" stroke="${theme.border}"/>
  <circle cx="${n(cx - w / 2 + 12)}" cy="${n(cy)}" r="3.5" fill="${theme.accent3}"/>
  <text x="${n(cx - w / 2 + 20)}" y="${n(cy + 4)}" font-size="11" font-weight="600" fill="${theme.text}" textLength="${n(tw)}">${esc(text)}</text>
</g>`;
}

/** The whole editor illustration: chrome, clipped map, polygon and both cursors. */
function mapEditor(theme) {
  const shape = polygon(theme);
  const pedro = cursor(theme, 'pedro', 'Pedro', theme.accent, PEDRO_PATH);
  const you = cursor(theme, 'you', 'You', theme.accent2, YOU_PATH);
  const defs = `<clipPath id="ha-map"><rect width="${MAP.w}" height="${MAP.h}" rx="8"/></clipPath>`;
  const body = `${editorChrome(theme)}
<g transform="translate(${MAP.x} ${MAP.y})">
  <g clip-path="url(#ha-map)">${terrain(theme)}
${shape.body}
${you.body}
${pedro.body}
  </g>
  <rect width="${MAP.w}" height="${MAP.h}" rx="8" fill="none" stroke="${theme.border}"/>
</g>`;
  return { css: [shape.css, pedro.css, you.css].join('\n'), defs, body };
}

const SHARED_CSS = `.ha-ping{transform-box:fill-box;transform-origin:center;animation:ha-ping 2s ease-out infinite}
@keyframes ha-ping{0%{transform:scale(1);opacity:.7}70%,100%{transform:scale(2.6);opacity:0}}`;

/**
 * Hero banner: intro on the left (eyebrow, headline, role, typed taglines, fact chips) and a
 * looping miniature collaborative map editor on the right.
 */
export function renderHero(profile, data, theme) {
  const bg = background(theme);
  const typed = taglines(theme, profile.taglines ?? [], PAD + 2, 202);
  const editor = mapEditor(theme);
  const body = `${bg.body}
${eyebrow(theme, PAD, 40)}
${headline(theme, profile, PAD - 2, 128)}
${roleLine(theme, profile, PAD, 162)}
${typed.body}
${factChips(theme, profile.facts ?? [], PAD, 228)}
${editor.body}`;
  return svgDoc({
    width: WIDTH,
    height: HEIGHT,
    title: `${profile.name}, ${profile.role}`,
    desc: `${profile.role} based in ${profile.location}. ${(profile.taglines ?? []).join(' ')}`,
    css: [SHARED_CSS, typed.css, editor.css].join('\n'),
    defs: bg.defs + typed.defs + editor.defs,
    body,
  });
}
