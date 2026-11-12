// "Repo Snake": an auto-playing snake whose food is my real public repositories.
//
// Geometry: repositories are pills laid out 3 per row. The snake follows a serpentine route
// along the row centre lines (left to right, U-turn, right to left, ...). Everything runs on ONE
// SMIL timeline: the head rides the route with <animateMotion>, the body is the same route drawn
// with a dash that trails the head, and each pill is clipped away exactly as the head passes it.

import { MONO_EM, WIDTH, esc, fit, n, panel, svgDoc } from './theme.mjs';

const PAD = 24; // card padding
const HUD_H = 46; // title / now eating / score row
const ROW = 56; // distance between row centre lines (= U-turn diameter)
const TURN = ROW / 2; // U-turn radius
const COLS = 3;
const PILL_H = 30;
const NAME_SIZE = 12.5;
const NAME_MAX = 176; // widest repository name before it is ellipsised
const BODY_W = 14; // body thickness
const HEAD_R = 9.5;
const START_LEN = 56; // body length before the first bite
const GROW = 10; // body growth per repository eaten
const SPEED = 190; // px per second
const PAUSE = 1.8; // seconds between the snake leaving and the next round
const POP = 0.6; // seconds the pills take to fade back in
const MOUTH = 6; // the bite edge sits this far in front of the head centre

/** Board, rows, pills and the route the snake follows. Pure geometry, no timing. */
export function layout(repos) {
  const boardX = PAD;
  const boardY = PAD + HUD_H;
  const boardW = WIDTH - PAD * 2;
  const rows = Math.max(1, Math.ceil(repos.length / COLS));
  const boardH = rows * ROW + 16;
  const xL = boardX + 4 + TURN; // x where the snake turns on the left
  const xR = boardX + boardW - 4 - TURN; // ... and on the right
  const slotX = xL + 24;
  const slotW = (xR - 24 - slotX) / COLS;
  const rowY = (r) => boardY + 8 + TURN + r * ROW;

  const pills = repos.map((repo, i) => {
    const r = Math.floor(i / COLS);
    const dir = r % 2 === 0 ? 1 : -1;
    const col = dir > 0 ? i % COLS : COLS - 1 - (i % COLS); // eaten in travel order
    const name = fit(repo.name, NAME_SIZE, NAME_MAX, { mono: true });
    const w = 36 + name.length * NAME_SIZE * MONO_EM;
    const x = slotX + col * slotW + (slotW - w) / 2;
    return { repo, name, row: r, dir, x, w, y: rowY(r) - PILL_H / 2 };
  });

  // Route: enter from the left outside the board, serpentine, leave outside the board.
  const xStart = boardX - 110;
  const endLen = START_LEN + GROW * repos.length + 40; // far enough for the whole body to leave
  const segs = []; // { row, x0, x1, d0 } straight runs with their start distance
  let d = 0;
  let path = `M${n(xStart)} ${n(rowY(0))}`;
  for (let r = 0; r < rows; r += 1) {
    const dir = r % 2 === 0 ? 1 : -1;
    const last = r === rows - 1;
    const x0 = r === 0 ? xStart : dir > 0 ? xL : xR;
    const x1 = last ? (dir > 0 ? boardX + boardW + endLen : boardX - endLen) : dir > 0 ? xR : xL;
    segs.push({ row: r, dir, x0, d0: d });
    d += Math.abs(x1 - x0);
    path += ` H${n(x1)}`;
    if (!last) {
      path += ` A${TURN} ${TURN} 0 0 ${dir > 0 ? 1 : 0} ${n(x1)} ${n(rowY(r + 1))}`;
      d += Math.PI * TURN;
    }
  }
  const distAt = (row, x) => {
    const s = segs[row];
    return s.d0 + s.dir * (x - s.x0);
  };
  const height = boardY + boardH + 40;
  return { boardX, boardY, boardW, boardH, rows, pills, path, length: d, distAt, xStart, rowY, height };
}
/**
 * Timing of one loop. The head moves at constant SPEED along the route; each pill is eaten
 * between the moments the mouth reaches its leading and its trailing edge.
 */
export function timeline(geo) {
  const s0 = geo.boardX + 50 - geo.xStart; // head distance at t=0: just inside the board
  const travel = (geo.length - s0) / SPEED;
  const T = travel + PAUSE;
  const reset = travel + 0.4; // pills start growing back
  const at = (s) => (s - s0) / SPEED;
  const eats = geo.pills.map((p) => {
    const lead = p.dir > 0 ? p.x : p.x + p.w;
    const trail = p.dir > 0 ? p.x + p.w : p.x;
    const ts = at(geo.distAt(p.row, lead) - MOUTH);
    const te = at(geo.distAt(p.row, trail) - MOUTH);
    return { ts, te };
  });
  const headDist = (t) => Math.min(s0 + SPEED * t, geo.length);
  const bodyLen = (t) =>
    START_LEN + eats.reduce((sum, e) => sum + GROW * Math.min(1, Math.max(0, (t - e.ts) / (e.te - e.ts))), 0);
  // Every moment where the motion changes slope; linear interpolation is exact in between.
  const keys = [...new Set([0, ...eats.flatMap((e) => [e.ts, e.te]), travel, T].map((t) => +t.toFixed(4)))].sort(
    (a, b) => a - b,
  );
  return { T, travel, reset, pop: reset + POP, eats, keys, headDist, bodyLen };
}

/** keyTimes string (fractions of the loop) for absolute times in seconds. */
function kt(times, T) {
  return times.map((t) => n4(t / T)).join(';');
}
const n4 = (v) => String(Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000);

/** SMIL boilerplate shared by every animation so they all stay on one clock. */
function anim(attr, values, times, T, extra = '') {
  return `<animate attributeName="${attr}" values="${values.join(';')}" keyTimes="${kt(times, T)}" dur="${n(T)}s" repeatCount="indefinite"${extra}/>`;
}
/** Faint dotted board the game is played on. */
function board(geo, theme) {
  const { boardX: x, boardY: y, boardW: w, boardH: h } = geo;
  return `<rect x="${x}" y="${y}" width="${n(w)}" height="${h}" rx="12" fill="${theme.panelAlt}" stroke="${theme.border}"/>
<rect x="${x}" y="${y}" width="${n(w)}" height="${h}" rx="12" fill="url(#dots)"/>`;
}

/** One repository pill: a dashed ghost slot plus the real pill, clipped away bite by bite. */
function pill(p, e, i, tl, theme) {
  const { T, reset, pop } = tl;
  const color = p.repo.color ?? theme.muted;
  const cx = p.x - 2;
  const cw = p.w + 4;
  // Eaten pills are restored in one step at `reset` (still invisible), then fade back in.
  const times = [0, e.ts, e.te, reset, reset + 0.01, T];
  const fadeTimes = [0, reset, reset + 0.01, pop, T];
  const clipX = p.dir > 0 ? [cx, cx, cx + cw, cx + cw, cx, cx] : [cx, cx, cx, cx, cx, cx];
  const clipW = [cw, cw, 0, 0, cw, cw];
  const plusX = p.dir > 0 ? p.x + p.w - 6 : p.x + 6;
  const plusTimes = [0, e.te, e.te + 0.08, e.te + 0.8, T];
  const rx = PILL_H / 2;
  return `<clipPath id="c${i}"><rect x="${n(cx)}" y="${n(p.y - 2)}" width="${n(cw)}" height="${PILL_H + 4}">
${p.dir > 0 ? anim('x', clipX.map(n), times, T) : ''}${anim('width', clipW.map(n), times, T)}
</rect></clipPath>
<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.w)}" height="${PILL_H}" rx="${rx}" fill="none" stroke="${theme.border}" stroke-dasharray="3 4"/>
<g clip-path="url(#c${i})">
${anim('opacity', [1, 1, 0, 1, 1], fadeTimes, T)}
<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.w)}" height="${PILL_H}" rx="${rx}" fill="${theme.panel}" stroke="${color}" stroke-opacity="0.6"/>
<circle cx="${n(p.x + 16)}" cy="${n(p.y + PILL_H / 2)}" r="4.5" fill="${color}" stroke="${theme.border}" stroke-width="0.6"/>
<text class="mono" x="${n(p.x + 28)}" y="${n(p.y + PILL_H / 2 + 4.3)}" font-size="${NAME_SIZE}" fill="${theme.text}">${esc(p.name)}</text>
</g>
<text class="mono" x="${n(plusX)}" y="${n(p.y - 3)}" text-anchor="middle" font-size="11" font-weight="700" fill="${theme.accent3}" opacity="0">+1
${anim('opacity', [0, 0, 1, 0, 0], plusTimes, T)}
<animateTransform attributeName="transform" type="translate" values="0 6;0 6;0 0;0 -10;0 -10" keyTimes="${kt(plusTimes, T)}" dur="${n(T)}s" repeatCount="indefinite"/>
</text>`;
}
/** Body (a dash trailing the head along the route) and the head riding the same route. */
function snakeBody(geo, tl, theme) {
  const { T, keys } = tl;
  const len = keys.map((t) => tl.bodyLen(t));
  const head = keys.map((t) => tl.headDist(t));
  const dash = len.map((l) => `${n(l)} 99999`);
  const offset = len.map((l, i) => n(l - head[i]));
  const stroke = (width, color, opacity) =>
    `<use href="#route" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${dash[0]}" stroke-dashoffset="${offset[0]}">
${anim('stroke-dasharray', dash, keys, T)}${anim('stroke-dashoffset', offset, keys, T)}
</use>`;
  const points = head.map((d) => n4(d / geo.length)).join(';');
  const eye = (y) =>
    `<circle cx="2.5" cy="${y}" r="2.9" fill="#ffffff"/><circle cx="3.4" cy="${y}" r="1.45" fill="#0d1117"/>`;
  return `<g clip-path="url(#board)">
${stroke(BODY_W, theme.accent, 1)}
${stroke(4, '#ffffff', theme.name === 'dark' ? 0.16 : 0.28)}
<g>
<path d="M8 0 L15 0 M15 0 l3 -2.4 M15 0 l3 2.4" stroke="${theme.danger}" stroke-width="1.6" stroke-linecap="round" fill="none">
<animate attributeName="opacity" values="1;0;1" keyTimes="0;0.5;1" dur="0.9s" calcMode="discrete" repeatCount="indefinite"/>
</path>
<circle r="${HEAD_R}" fill="${theme.accent}"/>
${eye(-4.2)}${eye(4.2)}
<animateMotion dur="${n(T)}s" repeatCount="indefinite" rotate="auto" calcMode="linear" keyPoints="${points}" keyTimes="${kt(keys, T)}"><mpath href="#route"/></animateMotion>
</g>
</g>`;
}

/** Discrete visibility window [from, to) inside the loop (to = T keeps it until the end). */
function showBetween(from, to, T) {
  if (from <= 0) return `<animate attributeName="opacity" values="1;0" keyTimes="0;${n4(to / T)}" dur="${n(T)}s" calcMode="discrete" repeatCount="indefinite"/>`;
  if (to >= T) return `<animate attributeName="opacity" values="0;1" keyTimes="0;${n4(from / T)}" dur="${n(T)}s" calcMode="discrete" repeatCount="indefinite"/>`;
  return `<animate attributeName="opacity" values="0;1;0" keyTimes="0;${n4(from / T)};${n4(to / T)}" dur="${n(T)}s" calcMode="discrete" repeatCount="indefinite"/>`;
}
/** Title, "now eating" ticker and score, all switching on the same clock as the snake. */
function hud(geo, tl, theme) {
  const { T, eats, reset } = tl;
  const total = geo.pills.length;
  const pad2 = (v) => String(v).padStart(2, '0');
  const tickerY = PAD + 38;
  const ticker = (from, to, body) =>
    `<text x="${PAD}" y="${tickerY}" font-size="12.5" fill="${theme.muted}" opacity="${from <= 0 ? 1 : 0}">${body}${showBetween(from, to, T)}</text>`;
  const strong = (s) => `<tspan fill="${theme.text}" font-weight="600">${esc(s)}</tspan>`;

  let out = `<circle cx="${PAD + 5}" cy="${PAD + 13}" r="4" fill="${theme.accent}">
<animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite"/></circle>
<text class="mono" x="${PAD + 16}" y="${PAD + 17.5}" font-size="12" font-weight="700" letter-spacing="2.2" fill="${theme.accent}">REPO SNAKE</text>
<text class="mono" x="${PAD + 132}" y="${PAD + 17.5}" font-size="11" letter-spacing="1" fill="${theme.faint}">AUTO-PLAY</text>`;

  out += ticker(0, eats[0]?.ts ?? reset, 'Sniffing out fresh repositories…');
  geo.pills.forEach((p, i) => {
    const to = i + 1 < eats.length ? eats[i + 1].ts : reset;
    const lang = p.repo.language ? ` · ${esc(p.repo.language)}` : '';
    out += ticker(eats[i].ts, to, `Now eating ${strong(p.repo.name)}${lang}`);
  });
  out += ticker(reset, T, `All ${strong(`${total} repositories`)} eaten · respawning`);

  // Score: one text per value, each visible while that many repositories have been eaten.
  const right = WIDTH - PAD;
  out += `<text class="mono" x="${right}" y="${PAD + 38}" text-anchor="end" font-size="11" fill="${theme.faint}" letter-spacing="1">REPOS EATEN</text>`;
  for (let k = 0; k <= total; k += 1) {
    const from = k === 0 ? 0 : eats[k - 1].te;
    const to = k === total ? T : eats[k].te;
    out += `<text class="mono" x="${right}" y="${PAD + 19}" text-anchor="end" font-size="20" font-weight="700" fill="${theme.text}" opacity="${k === 0 ? 1 : 0}">${pad2(k)}<tspan fill="${theme.faint}" font-weight="400"> / ${pad2(total)}</tspan>${showBetween(from, to, T)}</text>`;
  }
  return out;
}

/** Repositories on the menu: newest push first, minus hidden ones, capped. */
export function menu(data, config = {}) {
  const hidden = new Set((config.hidden ?? []).map((s) => s.toLowerCase()));
  return data.repos.filter((r) => !hidden.has(r.name.toLowerCase())).slice(0, config.maxRepos ?? 18);
}

export function renderRepoSnake(data, config, theme) {
  const repos = menu(data, config);
  const geo = layout(repos);
  const tl = timeline(geo);
  const defs = `<path id="route" d="${geo.path}"/>
<clipPath id="board"><rect x="${geo.boardX}" y="${geo.boardY}" width="${n(geo.boardW)}" height="${geo.boardH}" rx="12"/></clipPath>
<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="1" fill="${theme.border}"/></pattern>`;
  const body = [
    panel(theme, { width: WIDTH, height: geo.height }),
    hud(geo, tl, theme),
    board(geo, theme),
    ...geo.pills.map((p, i) => pill(p, tl.eats[i], i, tl, theme)),
    snakeBody(geo, tl, theme),
    `<text x="${WIDTH / 2}" y="${geo.height - 15}" text-anchor="middle" font-size="12" fill="${theme.faint}">Every pill is one of my public repositories, newest first · refreshed daily</text>`,
  ].join('\n');
  return svgDoc({
    width: WIDTH,
    height: geo.height,
    title: 'Repo Snake',
    desc: `An auto-playing snake eating ${repos.length} public repositories of ${data.login}: ${repos.map((r) => r.name).join(', ')}.`,
    defs,
    body,
  });
}
