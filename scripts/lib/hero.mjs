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
const MAP_LOOP = 14; // seconds per drawing loop

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
// Scene: Pedro and "You" draw two zones AT THE SAME TIME and they overlap. The overlap flashes
// as a conflict, then resolves into a shared (striped) area: a CRDT merge where no edit is lost.
const ZONE_A = [[34, 46], [150, 38], [158, 128], [42, 140]]; // Pedro (map-local)
const ZONE_B = [[112, 78], [232, 66], [238, 166], [118, 174]]; // You
const REST = { pedro: [10, 10], you: [214, 186] };
// Waypoints as fractions of MAP_LOOP; both cursors draw concurrently, closing their shape last.
const tour = (zone, rest, t0, step) => [[0, rest], [t0 - 0.06, rest], ...zone.map((p, i) => [t0 + i * step, p]), [t0 + zone.length * step, zone[0]], [t0 + zone.length * step + 0.1, rest], [1, rest]];
const PEDRO_PATH = tour(ZONE_A, REST.pedro, 0.08, 0.075);
const YOU_PATH = tour(ZONE_B, REST.you, 0.12, 0.075);
const CLOSE_A = 0.08 + 4 * 0.075; // 0.38
const CLOSE_B = 0.12 + 4 * 0.075; // 0.42
const CONFLICT = [CLOSE_B + 0.01, 0.58]; // overlap flashes, "Conflict" badge
const MERGED = [0.6, 0.88]; // striped shared area, "Merged" badge
const FADE = [0.9, 0.96]; // everything fades out, the loop restarts empty
const MAP_START = 0.72; // t=0 shows the merged result, so the static frame tells the story

const P = (f) => `${n(f * 100)}%`;
/** Build an @keyframes rule from [fraction, declarations] stops. */
const keyframes = (name, stops) => `@keyframes ${name}{${stops.map(([f, d]) => `${P(f)}{${d}}`).join('')}}`;
const anim = (name, extra = '') => `animation:${name} ${MAP_LOOP}s -${n(MAP_START * MAP_LOOP)}s infinite ${extra}`;
/** Visible (opacity 1) between two fractions of the loop, with short fades. */
const shownBetween = (name, [a, b], cls = name) => `${keyframes(name, [[0, 'opacity:0'], [a, 'opacity:0'], [a + 0.02, 'opacity:1'], [b, 'opacity:1'], [b + 0.02, 'opacity:0'], [1, 'opacity:0']])}
.${cls}{${anim(name)}}`;

/** Convex polygon intersection (Sutherland–Hodgman); both zones are convex quads. */
function intersect(subject, clip) {
  let out = subject;
  for (let i = 0; i < clip.length; i += 1) {
    const [a, b] = [clip[i], clip[(i + 1) % clip.length]];
    const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const cross = (p, q) => {
      const t = side(p) / (side(p) - side(q));
      return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    };
    const input = out;
    out = [];
    input.forEach((p, j) => {
      const q = input[(j + 1) % input.length];
      if (side(q) >= 0) {
        if (side(p) < 0) out.push(cross(p, q));
        out.push(q);
      } else if (side(p) >= 0) out.push(cross(p, q));
    });
  }
  return out;
}
const pts = (poly) => poly.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

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

/** One zone: edges drawn as its cursor travels them, vertices popping in, fill when closed. */
function zone(theme, id, poly, path, closeAt, color) {
  let css = `${keyframes(`ha-f${id}`, [[0, 'opacity:0'], [closeAt, 'opacity:0'], [closeAt + 0.04, 'opacity:1'], [1, 'opacity:1']])}
.ha-f${id}{${anim(`ha-f${id}`)}}`;
  let body = `<polygon class="ha-f${id}" points="${pts(poly)}" fill="${color}" fill-opacity="${theme.name === 'dark' ? 0.16 : 0.13}"/>`;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const [s, e] = [path[i + 2][0], path[i + 3][0]]; // cursor leaves vertex i at s, reaches i+1 at e
    css += `${keyframes(`ha-e${id}${i}`, [[0, 'stroke-dashoffset:1'], [s, 'stroke-dashoffset:1;animation-timing-function:cubic-bezier(.45,0,.3,1)'], [e, 'stroke-dashoffset:0'], [1, 'stroke-dashoffset:0']])}
.ha-e${id}${i}{${anim(`ha-e${id}${i}`)}}
${keyframes(`ha-v${id}${i}`, [[0, 'transform:scale(0)'], [s, 'transform:scale(0)'], [s + 0.015, 'transform:scale(1.5)'], [s + 0.035, 'transform:scale(1)'], [1, 'transform:scale(1)']])}
.ha-v${id}${i}{transform-box:fill-box;transform-origin:center;${anim(`ha-v${id}${i}`)}}`;
    body += `<path class="ha-e${id}${i}" d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}" pathLength="1" stroke-dasharray="1 1" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
  });
  body += poly.map((p, i) => `<circle class="ha-v${id}${i}" cx="${p[0]}" cy="${p[1]}" r="4" fill="${theme.panel}" stroke="${color}" stroke-width="2"/>`).join('');
  return { css, body };
}

/** Status pill at the top of the map: "Conflict" first, then "Merged". */
function badge(theme, cls, text, color, x, y) {
  const tw = textWidth(text, 11, { weight: 700 });
  const w = tw + 30;
  return `<g class="${cls}" opacity="0"><rect x="${n(x - w / 2)}" y="${y}" width="${n(w)}" height="22" rx="11" fill="${theme.panel}" stroke="${color}"/>
<circle cx="${n(x - w / 2 + 12)}" cy="${y + 11}" r="3.5" fill="${color}"/>
<text x="${n(x - w / 2 + 21)}" y="${y + 15}" font-size="11" font-weight="700" fill="${theme.text}" textLength="${n(tw)}">${esc(text)}</text></g>`;
}

/** Both zones, the conflicting overlap and its resolution. */
function polygon(theme) {
  const a = zone(theme, 'a', ZONE_A, PEDRO_PATH, CLOSE_A, theme.accent);
  const b = zone(theme, 'b', ZONE_B, YOU_PATH, CLOSE_B, theme.accent2);
  const overlap = pts(intersect(ZONE_A, ZONE_B));
  const css = [
    a.css,
    b.css,
    keyframes('ha-shape', [[0, 'opacity:1'], [FADE[0], 'opacity:1'], [FADE[1], 'opacity:0'], [1, 'opacity:0']]),
    `.ha-shape{${anim('ha-shape')}}`,
    shownBetween('ha-conflict', CONFLICT),
    keyframes('ha-blink', [[0, 'opacity:.25'], [50, 'opacity:.75'], [100, 'opacity:.25']].map(([f, d]) => [f / 100, d])),
    `.ha-blink{animation:ha-blink .5s ease-in-out infinite}`,
    shownBetween('ha-merged', MERGED),
  ].join('\n');
  const cx = MAP.w / 2;
  const body = `<defs><pattern id="ha-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="${theme.accent3}" fill-opacity="0.55"/></pattern></defs>
<g class="ha-shape">${a.body}${b.body}
<g class="ha-conflict" opacity="0"><polygon class="ha-blink" points="${overlap}" fill="${theme.danger}" stroke="${theme.danger}" stroke-width="1.5" stroke-dasharray="3 2"/></g>
<g class="ha-merged" opacity="0"><polygon points="${overlap}" fill="url(#ha-hatch)" stroke="${theme.accent3}" stroke-width="1.5"/></g>
${badge(theme, 'ha-conflict', 'Conflict · overlapping edits', theme.danger, cx, 8)}
${badge(theme, 'ha-merged', 'Merged · no edits lost', theme.accent, cx, 8)}
</g>`;
  return { css, body };
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
