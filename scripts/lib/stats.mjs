// Two compact cards shown side by side in the README (both CARD_W x CARD_H):
//   renderStats     - four KPI tiles + the real contribution heatmap of the last 12 months
//   renderLanguages - stacked language bar + two-column legend
// Motion (SMIL, so it also runs inside <img>): a soft glint sweeps left to right over the heatmap
// and over the bar every few seconds. It starts off-card, so t=0 is the complete static image,
// and it is hidden for prefers-reduced-motion.

import { esc, n, panel, svgDoc, textWidth, fit, compact } from './theme.mjs';

export const CARD_W = 430;
export const CARD_H = 230;

const PAD = 20;
const INNER_W = CARD_W - PAD * 2;
const EYEBROW_Y = 31;
const EYEBROW_SIZE = 11;
const EYEBROW_TRACKING = 1.3;
const MONO_EM = 0.602;
const FOOT_Y = 207; // baseline of the muted footnote row

const SWEEP_BAND = 110; // width of the moving glint
const SWEEP_DUR = 9; // seconds per cycle
const SWEEP_TRAVEL = 0.26; // share of the cycle spent travelling; the rest is a calm pause
const SWEEP_BEGIN = 0.8; // first pass starts shortly after load

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Anything animated with SMIL carries class "fx"; SMIL ignores prefers-reduced-motion, so hide it.
const REDUCED_MOTION_CSS = '@media (prefers-reduced-motion:reduce){.fx{display:none}}';

/** Eyebrow on the left, optional mono meta text on the right of the same baseline. */
function header(theme, title, meta = '') {
  const metaW = meta ? textWidth(meta, EYEBROW_SIZE, { mono: true }) : 0;
  const room = INNER_W - (meta ? metaW + 16 : 0);
  const maxChars = Math.floor(room / (EYEBROW_SIZE * MONO_EM + EYEBROW_TRACKING));
  const label = title.length <= maxChars ? title : `${title.slice(0, maxChars - 1).trimEnd()}…`;
  const out = [
    `<text class="mono" x="${PAD}" y="${EYEBROW_Y}" font-size="${EYEBROW_SIZE}" letter-spacing="${EYEBROW_TRACKING}" fill="${theme.accent}">${esc(label)}</text>`,
  ];
  if (meta) {
    out.push(`<text class="mono" x="${CARD_W - PAD}" y="${EYEBROW_Y}" text-anchor="end" font-size="${EYEBROW_SIZE}" fill="${theme.faint}">${esc(meta)}</text>`);
  }
  return out.join('\n');
}

/** "9 Nov 2025" from "2025-11-09" (no time zone shifts: the date is used as written). */
function formatDay(iso) {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Colour of the moving glint: a light sheen on both themes (text colour on dark, white on light). */
function glintColor(theme) {
  return theme.name === 'dark' ? theme.text : theme.panel;
}

/** Horizontal gradient for the glint band (transparent - peak - transparent). */
function glintGradient(id, theme, peak) {
  const c = glintColor(theme);
  return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">` +
    `<stop offset="0" stop-color="${c}" stop-opacity="0"/>` +
    `<stop offset="0.5" stop-color="${c}" stop-opacity="${peak}"/>` +
    `<stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`;
}

/**
 * The glint itself: a band parked just left of `x` (so the first frame shows nothing), which
 * travels to the right edge `x + width` and then waits for the next cycle.
 */
function glintBand({ x, y, width, height, gradientId }) {
  const travel = width + SWEEP_BAND;
  const t = n(SWEEP_TRAVEL);
  return `<rect class="fx" x="${n(x - SWEEP_BAND)}" y="${n(y)}" width="${SWEEP_BAND}" height="${n(height)}" fill="url(#${gradientId})">` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;${n(travel)} 0;${n(travel)} 0" keyTimes="0;${t};1" ` +
    `calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1" dur="${SWEEP_DUR}s" begin="${SWEEP_BEGIN}s" repeatCount="indefinite"/></rect>`;
}

/** Small muted footnote (left) with optional extra markup on the right. */
function footnote(theme, text, maxWidth = INNER_W) {
  const line = fit(text, 11, maxWidth);
  return `<text x="${PAD}" y="${FOOT_Y}" font-size="11" fill="${theme.muted}">${esc(line)}</text>`;
}

/** Shared document wrapper for both cards. */
function card(theme, { title, desc, defs, body }) {
  return svgDoc({
    width: CARD_W,
    height: CARD_H,
    title,
    desc,
    css: REDUCED_MOTION_CSS,
    defs,
    body: [panel(theme, { width: CARD_W, height: CARD_H }), ...body].join('\n'),
  });
}

// ---------------------------------------------------------------- stats card

const TILE_Y = 44;
const TILE_H = 56;
const TILE_GAP = 8;
const MAP_Y = 131; // top of the heatmap (month labels sit just above it)
const CELL_GAP = 1.6;

/** One KPI tile: big mono number (+ optional unit), small label, a tiny coloured "pixel". */
function kpiTile({ value, unit, label, color }, x, width, theme) {
  const numW = textWidth(value, 22, { mono: true });
  const labelText = fit(label, 11, width - 22);
  const out = [
    `<rect x="${n(x + 0.5)}" y="${TILE_Y + 0.5}" width="${n(width - 1)}" height="${TILE_H - 1}" rx="10" fill="${theme.panelAlt}" stroke="${theme.border}"/>`,
    `<rect x="${n(x + width - 15)}" y="${TILE_Y + 10}" width="5" height="5" rx="1.2" fill="${color}"/>`,
    `<text class="mono" x="${n(x + 11)}" y="${TILE_Y + 28}" font-size="22" font-weight="700" fill="${theme.text}">${esc(value)}</text>`,
    `<text x="${n(x + 11)}" y="${TILE_Y + 45}" font-size="11" fill="${theme.muted}" textLength="${n(textWidth(labelText, 11))}">${esc(labelText)}</text>`,
  ];
  if (unit && numW + textWidth(unit, 11) + 28 < width) {
    out.push(`<text x="${n(x + 11 + numW + 4)}" y="${TILE_Y + 28}" font-size="11" fill="${theme.muted}">${esc(unit)}</text>`);
  }
  return out.join('');
}

function kpiRow(data, theme) {
  const cal = data.calendar ?? {};
  const tiles = [
    { value: compact(cal.total), label: 'contributions', color: theme.accent },
    { value: compact(cal.activeDays), label: 'active days', color: theme.accent2 },
    { value: compact(cal.longestStreak), unit: Number(cal.longestStreak) === 1 ? 'day' : 'days', label: 'longest streak', color: theme.accent3 },
    { value: compact(data.totals?.repos), label: 'public repos', color: theme.accent },
  ];
  const width = (INNER_W - TILE_GAP * (tiles.length - 1)) / tiles.length;
  return tiles.map((tile, i) => kpiTile(tile, PAD + i * (width + TILE_GAP), width, theme)).join('\n');
}

/** Geometry of the heatmap: the weeks span the inner width exactly. */
function mapGeometry(weeks) {
  const pitch = INNER_W / Math.max(weeks.length, 1);
  return { pitch, size: pitch - CELL_GAP, height: pitch * 7 - CELL_GAP };
}

/** The contribution cells, plus an accent ring on the most recent day ("you are here"). */
function heatmapCells(weeks, geo, theme, cellId) {
  // Every cell <use>s one shared rect (size + radius); the fill is inherited from the <use>.
  const cells = [];
  weeks.forEach((week, col) => {
    for (const day of week) {
      const x = PAD + col * geo.pitch;
      const y = MAP_Y + day.weekday * geo.pitch;
      cells.push(`<use href="#${cellId}" x="${n(x)}" y="${n(y)}" fill="${theme.levels[day.level] ?? theme.levels[0]}"/>`);
    }
  });
  const lastWeek = weeks.at(-1) ?? [];
  const today = lastWeek.at(-1);
  if (today) {
    const x = PAD + (weeks.length - 1) * geo.pitch;
    const y = MAP_Y + today.weekday * geo.pitch;
    cells.push(`<rect x="${n(x - 1)}" y="${n(y - 1)}" width="${n(geo.size + 2)}" height="${n(geo.size + 2)}" rx="2.2" fill="none" stroke="${theme.accent3}" stroke-width="1.2"/>`);
  }
  return cells.join('');
}

/**
 * Mask that only lets the glint through where cells are: a pattern of white cells, painted over
 * runs of weeks that share the same first weekday and length (usually: first week, full weeks,
 * current week), so missing days at both ends stay dark.
 */
function heatmapMask(weeks, geo, id) {
  const runs = [];
  weeks.forEach((week, col) => {
    const first = week[0]?.weekday ?? 0;
    const prev = runs.at(-1);
    if (prev && prev.first === first && prev.days === week.length) prev.len += 1;
    else runs.push({ start: col, len: 1, first, days: week.length });
  });
  const pattern = `<pattern id="${id}-p" patternUnits="userSpaceOnUse" x="${PAD}" y="${MAP_Y}" width="${n(geo.pitch)}" height="${n(geo.pitch)}">` +
    `<rect width="${n(geo.size)}" height="${n(geo.size)}" rx="1.4" fill="#fff"/></pattern>`;
  const rects = runs.map((r) =>
    `<rect x="${n(PAD + r.start * geo.pitch)}" y="${n(MAP_Y + r.first * geo.pitch)}" width="${n(r.len * geo.pitch)}" height="${n(r.days * geo.pitch)}" fill="url(#${id}-p)"/>`);
  return `${pattern}<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CARD_W}" height="${CARD_H}">${rects.join('')}</mask>`;
}

/** Month names above the columns where a new month starts (crowded labels are dropped). */
function monthLabels(weeks, geo, theme) {
  const candidates = [];
  weeks.forEach((week, col) => {
    const month = Number(String(week[0]?.date ?? '').slice(5, 7));
    const prevMonth = col ? Number(String(weeks[col - 1][0]?.date ?? '').slice(5, 7)) : null;
    if (month && month !== prevMonth) candidates.push({ x: PAD + col * geo.pitch, label: MONTHS[month - 1] });
  });
  const labels = [];
  let lastEnd = -Infinity;
  candidates.forEach((c, i) => {
    const width = textWidth(c.label, 11);
    const next = candidates[i + 1];
    // A partial first month is only labelled when it leaves room for the next one.
    if (i === 0 && next && next.x < c.x + width + 8) return;
    if (c.x < lastEnd + 8 || c.x + width > CARD_W - PAD) return;
    labels.push(`<text x="${n(c.x)}" y="${MAP_Y - 7}" font-size="11" fill="${theme.muted}">${c.label}</text>`);
    lastEnd = c.x + width;
  });
  return labels.join('');
}

/** "Less [] [] [] [] [] More" scale, right-aligned on the footnote row. Returns markup + width. */
function levelScale(theme) {
  const box = 9;
  const gap = 3;
  const lessW = textWidth('Less', 11);
  const moreW = textWidth('More', 11);
  const width = lessW + 6 + theme.levels.length * (box + gap) - gap + 6 + moreW;
  let x = CARD_W - PAD - width;
  const out = [`<text x="${n(x)}" y="${FOOT_Y}" font-size="11" fill="${theme.muted}">Less</text>`];
  x += lessW + 6;
  theme.levels.forEach((color) => {
    out.push(`<rect x="${n(x)}" y="${FOOT_Y - 8.5}" width="${box}" height="${box}" rx="2" fill="${color}"/>`);
    x += box + gap;
  });
  out.push(`<text x="${n(x - gap + 6)}" y="${FOOT_Y}" font-size="11" fill="${theme.muted}">More</text>`);
  return { svg: out.join(''), width };
}

/**
 * KPI tiles + contribution heatmap of the last 12 months.
 * @param {object} data normalized profile data (github.mjs)
 * @param {object} theme one of THEMES
 */
export function renderStats(data, theme) {
  const cal = data.calendar ?? {};
  const weeks = (cal.weeks ?? []).filter((w) => w.length);
  const geo = mapGeometry(weeks);
  const days = weeks.flat().map((d) => d.date).sort();
  const range = days.length ? `${formatDay(days[0])} – ${formatDay(days.at(-1))}` : '';
  const scale = levelScale(theme);
  const maskId = 'st-cells';
  const cellId = 'st-cell';
  const gradientId = 'st-glint';

  const defs = glintGradient(gradientId, theme, theme.name === 'dark' ? 0.32 : 0.55) + heatmapMask(weeks, geo, maskId) +
    `<rect id="${cellId}" width="${n(geo.size)}" height="${n(geo.size)}" rx="1.4"/>`;
  const body = [
    header(theme, 'LAST 12 MONTHS ON GITHUB', data.login ? `@${data.login}` : ''),
    kpiRow(data, theme),
    monthLabels(weeks, geo, theme),
    heatmapCells(weeks, geo, theme, cellId),
    `<g mask="url(#${maskId})">${glintBand({ x: PAD, y: MAP_Y, width: INNER_W, height: geo.height, gradientId })}</g>`,
    footnote(theme, range, INNER_W - scale.width - 16),
    scale.svg,
  ];
  const desc = `${cal.total ?? 0} contributions on ${cal.activeDays ?? 0} active days, longest streak ` +
    `${cal.longestStreak ?? 0} days, ${data.totals?.repos ?? 0} public repositories${range ? ` (${range})` : ''}.`;
  return card(theme, { title: 'GitHub activity, last 12 months', desc, defs, body });
}

// ---------------------------------------------------------------- languages card

const TOP_LANGUAGES = 6;
const BAR_Y = 48;
const BAR_H = 14;
const LEGEND_Y = 94; // centre of the first legend row
const ROW_PITCH = 28;
const LEGEND_GAP = 28; // between the two legend columns

/** Top languages by share, the remainder grouped as "Other" (in the muted theme colour). */
function languageSlices(languages, theme) {
  const sorted = (languages ?? []).filter((l) => l.pct > 0).sort((a, b) => b.pct - a.pct);
  const slices = sorted.slice(0, TOP_LANGUAGES).map((l) => ({ name: l.name, color: l.color || theme.faint, pct: l.pct }));
  const rest = sorted.slice(TOP_LANGUAGES).reduce((sum, l) => sum + l.pct, 0);
  if (rest >= 0.05) slices.push({ name: 'Other', color: theme.faint, pct: rest });
  return slices;
}

/** Hairline used around every language colour so near-black / near-white ones stay visible. */
function hairline(theme) {
  return `stroke="${theme.text}" stroke-opacity="${theme.name === 'dark' ? 0.22 : 0.16}"`;
}

/** Rounded stacked bar; slices are separated by a thin gap in the card colour. */
function languageBar(slices, theme, clipId, gradientId) {
  const total = slices.reduce((sum, s) => sum + s.pct, 0) || 1;
  const parts = [];
  const seams = [];
  let x = PAD;
  slices.forEach((s, i) => {
    const width = (s.pct / total) * INNER_W;
    parts.push(`<rect x="${n(x)}" y="${BAR_Y}" width="${n(width + 0.5)}" height="${BAR_H}" fill="${s.color}"/>`);
    x += width;
    if (i < slices.length - 1) seams.push(`<rect x="${n(x - 1)}" y="${BAR_Y}" width="2" height="${BAR_H}" fill="${theme.panel}"/>`);
  });
  const radius = BAR_H / 2;
  return [
    `<g clip-path="url(#${clipId})">${parts.join('')}${seams.join('')}`,
    glintBand({ x: PAD, y: BAR_Y, width: INNER_W, height: BAR_H, gradientId }),
    '</g>',
    `<rect x="${PAD + 0.25}" y="${BAR_Y + 0.25}" width="${INNER_W - 0.5}" height="${BAR_H - 0.5}" rx="${radius}" fill="none" ${hairline(theme)} stroke-width="0.5"/>`,
  ].join('');
}

/** Two-column legend (column-major): dot, name, right-aligned percentage. */
function languageLegend(slices, theme) {
  const rows = Math.ceil(slices.length / 2);
  const colW = (INNER_W - LEGEND_GAP) / 2;
  const out = [];
  slices.forEach((s, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = PAD + col * (colW + LEGEND_GAP);
    const right = x + colW;
    const cy = LEGEND_Y + row * ROW_PITCH;
    const pct = `${s.pct.toFixed(1)}%`;
    const pctW = textWidth(pct, 12, { mono: true });
    const name = fit(s.name, 13, colW - 16 - pctW - 12);
    out.push(
      `<circle cx="${n(x + 5)}" cy="${n(cy)}" r="5" fill="${s.color}" ${hairline(theme)}/>`,
      `<text x="${n(x + 17)}" y="${n(cy + 4.5)}" font-size="13" fill="${theme.text}">${esc(name)}</text>`,
      `<text class="mono" x="${n(right)}" y="${n(cy + 4)}" text-anchor="end" font-size="12" fill="${theme.muted}">${esc(pct)}</text>`,
    );
    if (row < rows - 1 && i < slices.length - 1) {
      const y = cy + ROW_PITCH / 2;
      out.push(`<line x1="${n(x)}" x2="${n(right)}" y1="${n(y)}" y2="${n(y)}" stroke="${theme.border}" stroke-dasharray="1 3"/>`);
    }
  });
  return out.join('\n');
}

/**
 * Language share across public repositories (each repo counts once, split by bytes).
 * @param {object} data normalized profile data (github.mjs)
 * @param {object} theme one of THEMES
 */
export function renderLanguages(data, theme) {
  const all = data.languages ?? [];
  const slices = languageSlices(all, theme);
  const clipId = 'ln-bar';
  const gradientId = 'ln-glint';
  const defs = glintGradient(gradientId, theme, theme.name === 'dark' ? 0.4 : 0.6) +
    `<clipPath id="${clipId}"><rect x="${PAD}" y="${BAR_Y}" width="${INNER_W}" height="${BAR_H}" rx="${BAR_H / 2}"/></clipPath>`;
  const body = [
    header(theme, 'LANGUAGES ACROSS MY PUBLIC REPOS', all.length ? `${all.length} languages` : ''),
    slices.length ? languageBar(slices, theme, clipId, gradientId) : '',
    languageLegend(slices, theme),
    footnote(theme, 'Every repository counts once, split by its code size'),
  ];
  const desc = slices.map((s) => `${s.name} ${s.pct.toFixed(1)}%`).join(', ');
  return card(theme, { title: 'Languages across public repositories', desc, defs, body });
}
