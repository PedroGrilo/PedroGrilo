// Featured project card (430 x 170). Shown two per row in the README, so every card has the
// exact same size and the same anchored rows: eyebrow, name, pitch (up to 3 lines), footer.

import { MONO_EM, compact, esc, fit, n, panel, svgDoc, textWidth, wrap } from './theme.mjs';

export const CARD_WIDTH = 430;
export const CARD_HEIGHT = 170;

const PAD = 20;
const INNER = CARD_WIDTH - PAD * 2;
const GLOW_RADIUS = 250; // reach of the corner light, measured from the top-right corner
const PIXEL_PITCH = 10; // spacing of the pixel grid inside that light
const PIXEL_RADIUS = 132; // the grid fades out over this distance from the corner

// Vertical rhythm (text baselines) and the space kept free for the "open" glyph.
const OPEN_SIZE = 28;
const HEADER_WIDTH = INNER - OPEN_SIZE - 12;
const EYEBROW_Y = 31;
const EYEBROW_SIZE = 11;
const EYEBROW_TRACKING = 1.3;
const NAME_Y = 56;
const PITCH_Y = 79;
const PITCH_LINE = 18;
const PITCH_WIDTH = INNER - 46; // measured width; leaves room for wider fallback fonts
const FOOT_Y = CARD_HEIGHT - 28; // vertical centre of the footer row
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Thin aliases over the shared, glyph-calibrated measurement in theme.mjs.
const measure = (text, size, weight = 400) => textWidth(text, size, { weight });
const fitMeasured = (text, size, maxWidth, weight = 400) => fit(text, size, maxWidth, { weight });
const wrapMeasured = (text, size, maxWidth, maxLines) => wrap(text, size, maxWidth, maxLines);

/** Truncate the uppercase mono eyebrow (fixed advance + tracking per character). */
function fitEyebrow(text, maxWidth) {
  const maxChars = Math.floor(maxWidth / (EYEBROW_SIZE * MONO_EM + EYEBROW_TRACKING));
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

/** "Updated Nov 2026" from an ISO timestamp (UTC, month precision). Empty when unparsable. */
function updatedLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `Updated ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Gradient stops that fade a colour out along (1 - t)^2. The slope reaches zero at the rim,
 * so the light has no visible edge (a linear fade shows one on dark surfaces).
 */
function easedStops(color, alpha) {
  return [0, 0.25, 0.5, 0.75, 1]
    .map((t) => `<stop offset="${t}" stop-color="${color}" stop-opacity="${n(alpha * (1 - t) ** 2)}"/>`)
    .join('');
}

/** Five-point star centred on (cx, cy), outer radius r. */
function starPath(cx, cy, r) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 ? r * 0.45 : r;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${n(cx + radius * Math.cos(angle))},${n(cy + radius * Math.sin(angle))}`);
  }
  return `M${points.join('L')}Z`;
}

/** Far-right footer item: star count when the repo has stars, else the last push month. */
function metaItem(repo, theme, right, y) {
  if (repo.stars > 0) {
    const label = compact(repo.stars);
    const width = measure(label, 12, 600);
    const starR = 6.5;
    const starX = right - width - 6 - starR; // star, 6px gap, count
    return {
      width: width + 6 + starR * 2,
      svg: `<path d="${starPath(starX, y - 0.5, starR)}" fill="${theme.accent3}"/>` +
        `<text x="${n(right)}" y="${n(y + 4)}" text-anchor="end" font-size="12" font-weight="600" fill="${theme.text}" textLength="${n(width)}">${esc(label)}</text>`,
    };
  }
  const label = updatedLabel(repo.pushedAt);
  if (!label) return { width: 0, svg: '' };
  const width = measure(label, 12);
  return {
    width,
    svg: `<text x="${n(right)}" y="${n(y + 4)}" text-anchor="end" font-size="12" fill="${theme.muted}" textLength="${n(width)}">${esc(label)}</text>`,
  };
}

/** Tag chips laid out left to right from `x`; tags that do not fit before `limit` are dropped. */
function tagChips(tags, theme, x, limit, y) {
  const height = 20;
  const gap = 6;
  let cursor = x;
  let svg = '';
  for (const tag of tags) {
    const textW = measure(tag, 11, 500);
    const width = Math.ceil(textW + 16);
    if (cursor + width > limit) continue;
    svg += `<rect x="${n(cursor + 0.5)}" y="${n(y - height / 2 + 0.5)}" width="${width - 1}" height="${height - 1}" rx="${(height - 1) / 2}" fill="${theme.panelAlt}" stroke="${theme.border}"/>` +
      `<text x="${n(cursor + width / 2)}" y="${n(y + 4)}" text-anchor="middle" font-size="11" font-weight="500" fill="${theme.muted}" textLength="${n(textW)}">${esc(tag)}</text>`;
    cursor += width + gap;
  }
  return svg;
}

/** Small "open" affordance: a rounded square with a north-east arrow. */
function openGlyph(theme, x, y, size) {
  const c = size / 2;
  return `<g transform="translate(${n(x)} ${n(y)})">` +
    `<rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="8" fill="${theme.panelAlt}" stroke="${theme.border}"/>` +
    `<path d="M${n(c - 4)} ${n(c + 4)}L${n(c + 4)} ${n(c - 4)}M${n(c - 2.5)} ${n(c - 4)}H${n(c + 4)}V${n(c + 2.5)}" fill="none" stroke="${theme.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g>`;
}

/**
 * One featured-repository card.
 * @param item  entry of `featured` in profile.config.mjs ({ repo, kind, pitch, tags })
 * @param repo  matching entry of data.repos (stars, language, color, pushedAt, ...)
 */
export function renderProjectCard(item, repo, theme) {
  const tint = repo.color ?? theme.accent; // language colour gives each card its identity
  const kind = fitEyebrow(String(item.kind ?? 'Project').toUpperCase(), HEADER_WIDTH);
  const name = fitMeasured(repo.name ?? item.repo, 19, HEADER_WIDTH - 30, 700);
  const pitch = wrapMeasured(item.pitch || repo.description, 13, PITCH_WIDTH, 3);

  // Footer: [dot language] [chips ...]            [stars | updated]
  const meta = metaItem(repo, theme, CARD_WIDTH - PAD, FOOT_Y);
  const language = repo.language ?? '';
  const languageX = PAD + 16; // after the colour dot
  const languageW = measure(language, 12, 500);
  const chipsX = language ? languageX + languageW + 12 : PAD;
  const chipsLimit = CARD_WIDTH - PAD - meta.width - (meta.width ? 12 : 0);
  const tags = (item.tags ?? []).filter((tag) => tag.toLowerCase() !== language.toLowerCase());

  const glowAlpha = 0.1 + theme.glow * 0.24; // a touch stronger than theme.glow alone on white
  const defs =
    `<clipPath id="card"><rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${CARD_HEIGHT - 1}" rx="14"/></clipPath>` +
    // soft light in the top-right corner
    `<radialGradient id="glow" cx="${CARD_WIDTH}" cy="0" r="${GLOW_RADIUS}" gradientUnits="userSpaceOnUse">` +
    easedStops(tint, glowAlpha) +
    `</radialGradient>` +
    // luminance mask for the pixel grid: it has to dissolve before it reaches the text block
    `<radialGradient id="fade" cx="${CARD_WIDTH}" cy="0" r="${PIXEL_RADIUS}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.5"/>` +
    `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<mask id="corner"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#fade)"/></mask>` +
    `<pattern id="pixels" width="${PIXEL_PITCH}" height="${PIXEL_PITCH}" patternUnits="userSpaceOnUse">` +
    `<rect x="4.4" y="4" width="1.6" height="1.6" fill="${tint}"/></pattern>` +
    `<linearGradient id="edge" x1="0" x2="1" y1="0" y2="0">` +
    `<stop offset="0" stop-color="${tint}" stop-opacity="0"/>` +
    `<stop offset="0.6" stop-color="${tint}" stop-opacity="0.9"/>` +
    `<stop offset="1" stop-color="${tint}" stop-opacity="0"/></linearGradient>`;

  // The only motion: the corner light breathes very gently (complete and static at t=0).
  const css = `.glow{animation:breathe 7s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:1}50%{opacity:.6}}`;

  const body = [
    panel(theme, { width: CARD_WIDTH, height: CARD_HEIGHT }),
    `<g clip-path="url(#card)">`,
    `<rect class="glow" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#glow)"/>`,
    // arcade touch: a pixel grid in the language colour that dissolves away from the corner
    `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#pixels)" mask="url(#corner)" opacity="0.65"/>`,
    // hairline in the language colour along the top edge, strongest under the glow
    `<rect x="${CARD_WIDTH - GLOW_RADIUS}" y="0.5" width="${GLOW_RADIUS}" height="1.5" fill="url(#edge)"/>`,
    `</g>`,
    `<text class="mono" x="${PAD}" y="${EYEBROW_Y}" font-size="${EYEBROW_SIZE}" letter-spacing="${EYEBROW_TRACKING}" fill="${theme.accent}">${esc(kind)}</text>`,
    `<text x="${PAD}" y="${NAME_Y}" font-size="19" font-weight="700" fill="${theme.text}">${esc(name)}</text>`,
    openGlyph(theme, CARD_WIDTH - PAD - OPEN_SIZE, 18, OPEN_SIZE),
    ...pitch.map((line, i) => `<text x="${PAD}" y="${PITCH_Y + i * PITCH_LINE}" font-size="13" fill="${theme.muted}">${esc(line)}</text>`),
    language
      ? `<circle cx="${PAD + 5}" cy="${FOOT_Y}" r="5" fill="${tint}" stroke="${theme.border}" stroke-width="0.75"/>` +
        `<text x="${languageX}" y="${FOOT_Y + 4}" font-size="12" font-weight="500" fill="${theme.text}" textLength="${n(languageW)}">${esc(language)}</text>`
      : '',
    tagChips(tags, theme, chipsX, chipsLimit, FOOT_Y),
    meta.svg,
  ].join('\n');

  const stat = repo.stars > 0 ? `${repo.stars} stars` : updatedLabel(repo.pushedAt);
  return svgDoc({
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    title: `${repo.name} — ${item.kind}`,
    desc: [item.pitch, language, tags.join(', '), stat].filter(Boolean).join(' · '),
    css,
    defs,
    body,
  });
}
