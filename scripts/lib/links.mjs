// Contact / link buttons: one pill per link (height 44, width from its content), placed side by
// side in the README. The primary link is filled with the accent colour, the others are outlined.

import { MONO_EM, esc, n, panel, svgDoc, textWidth } from './theme.mjs';

export const LINK_HEIGHT = 44;

const MAX_WIDTH = 236; // widest pill: a hint that does not fit is dropped, a longer label is cut
const PAD_LEFT = 13;
const PAD_RIGHT = 15;
const ICON = 16; // icon box, drawn on a 16 x 16 grid
const ICON_GAP = 8;
const DIVIDER_GAP = 9; // space on each side of the hairline between label and hint
const LABEL_SIZE = 14;
const HINT_SIZE = 12;

/** Estimated width of the semibold label; `textLength` then pins the rendered width to it. */
const measureLabel = (text, size) => textWidth(text, size, { weight: 600 });

/** Truncate with an ellipsis until the measured width fits. */
function fitLabel(text, size, maxWidth) {
  let out = String(text ?? '');
  if (measureLabel(out, size) <= maxWidth) return out;
  while (out.length > 1 && measureLabel(`${out}…`, size) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Whichever of the candidates reads best on top of `background`. */
function readableOn(background, candidates) {
  const base = luminance(background);
  const contrast = (c) => {
    const l = luminance(c);
    return (Math.max(base, l) + 0.05) / (Math.min(base, l) + 0.05);
  };
  return candidates.reduce((best, c) => (contrast(c) > contrast(best) ? c : best));
}

// Self-drawn glyphs on a 16 x 16 grid; they inherit stroke / fill from the wrapping <g>.
const ICONS = {
  globe:
    '<circle cx="8" cy="8" r="6.6"/><path d="M1.4 8h13.2M8 1.4c-4.3 3.9-4.3 9.3 0 13.2M8 1.4c4.3 3.9 4.3 9.3 0 13.2"/>',
  // neutral "in" mark: rounded square, dotted i and a single-arch n
  linkedin:
    '<rect x="1.4" y="1.4" width="13.2" height="13.2" rx="3.4"/><path d="M5.2 7.6v3.6M8 11.2V7.6M8 9.4a1.75 1.75 0 0 1 3.5 0v1.8"/><circle cx="5.2" cy="5.1" r="0.95" fill="currentColor" stroke="none"/>',
  mail:
    '<rect x="1.4" y="3" width="13.2" height="10" rx="2.4"/><path d="M2.2 4.4L8 8.9l5.8-4.5"/>',
  play:
    '<rect x="1.4" y="2.8" width="13.2" height="10.4" rx="3"/><path d="M6.7 5.9v4.2L10.3 8z" fill="currentColor" stroke-width="1"/>',
};

/** Icon positioned at (x, y); `color` drives both strokes and the filled details. */
function iconSvg(name, x, y, color) {
  const glyph = ICONS[name] ?? ICONS.globe;
  return `<g transform="translate(${n(x)} ${n(y)})" color="${color}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`;
}

/**
 * Primary pill only: a soft band of light crosses the button, then rests.
 * It is parked left of the canvas at t=0 (and whenever animations are off), so the static
 * frame is simply the clean button. Timeline of the 6s loop: rest 62%, sweep 26%, rest 12%.
 */
function sheenLayer(width, theme) {
  const band = 56;
  const brightest = luminance(theme.panel) > luminance(theme.text) ? theme.panel : theme.text;
  const travel = width + band + 40; // far enough for the skewed band to leave on the right
  return {
    defs:
      `<clipPath id="pill"><rect width="${width}" height="${LINK_HEIGHT}" rx="${LINK_HEIGHT / 2}"/></clipPath>` +
      `<linearGradient id="shine" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${brightest}" stop-opacity="0"/>` +
      `<stop offset="0.5" stop-color="${brightest}" stop-opacity="0.26"/><stop offset="1" stop-color="${brightest}" stop-opacity="0"/></linearGradient>`,
    css: `.sheen{animation:sweep 6s ease-in-out infinite}
@keyframes sweep{0%,62%{transform:translateX(0) skewX(-20deg)}88%,100%{transform:translateX(${travel}px) skewX(-20deg)}}`,
    svg: `<g clip-path="url(#pill)"><rect class="sheen" x="${-band - 14}" y="-10" width="${band}" height="${LINK_HEIGHT + 20}" fill="url(#shine)" transform="skewX(-20)"/></g>`,
  };
}

/** Human-readable target for the accessible description: the address without its scheme. */
function destination(url) {
  return String(url ?? '').replace(/^[a-z]+:(\/\/)?/i, '').replace(/\/$/, '');
}

/** Colours of one pill: filled accent for the primary link, outlined card surface otherwise. */
function pillColors(primary, theme) {
  if (!primary) {
    return { fill: theme.panel, ink: theme.text, icon: theme.accent, hint: theme.muted, hintOpacity: 1, rule: theme.border, ruleOpacity: 1 };
  }
  const ink = readableOn(theme.accent, [theme.panel, theme.text]);
  return { fill: theme.accent, ink, icon: ink, hint: ink, hintOpacity: 0.78, rule: ink, ruleOpacity: 0.28 };
}

/**
 * One link button.
 * @param link  entry of `links` in profile.config.mjs ({ id, label, hint, url, icon, primary })
 */
export function renderLink(link, theme) {
  const primary = Boolean(link.primary);
  const colors = pillColors(primary, theme);
  const mid = LINK_HEIGHT / 2;

  // Layout, left to right: [icon] label | hint. The rule and the hint are optional.
  const labelX = PAD_LEFT + ICON + ICON_GAP;
  const label = fitLabel(link.label, LABEL_SIZE, MAX_WIDTH - labelX - PAD_RIGHT);
  const labelW = measureLabel(label, LABEL_SIZE);
  const ruleX = Math.round(labelX + labelW + DIVIDER_GAP); // whole pixel keeps the hairline crisp
  const hintX = ruleX + 1 + DIVIDER_GAP;
  const hint = String(link.hint ?? '');
  const hintW = hint.length * HINT_SIZE * MONO_EM;
  const showHint = hint.length > 0 && hintX + hintW + PAD_RIGHT <= MAX_WIDTH;
  const width = Math.ceil((showHint ? hintX + hintW : labelX + labelW) + PAD_RIGHT);

  const surface = primary
    ? `<rect width="${width}" height="${LINK_HEIGHT}" rx="${mid}" fill="${colors.fill}"/>`
    : panel(theme, { width, height: LINK_HEIGHT, radius: mid - 0.5, fill: colors.fill });
  const sheen = primary ? sheenLayer(width, theme) : { defs: '', css: '', svg: '' };

  const body = [
    surface,
    sheen.svg,
    iconSvg(link.icon, PAD_LEFT, mid - ICON / 2, colors.icon),
    `<text x="${labelX}" y="${mid + 5}" font-size="${LABEL_SIZE}" font-weight="600" fill="${colors.ink}" textLength="${n(labelW)}">${esc(label)}</text>`,
    showHint
      ? `<rect x="${ruleX}" y="${mid - 8}" width="1" height="16" fill="${colors.rule}" opacity="${colors.ruleOpacity}"/>` +
        `<text class="mono" x="${hintX}" y="${mid + 4.5}" font-size="${HINT_SIZE}" fill="${colors.hint}" opacity="${colors.hintOpacity}" textLength="${n(hintW)}">${esc(hint)}</text>`
      : '',
  ].join('\n');

  return svgDoc({
    width,
    height: LINK_HEIGHT,
    title: [link.label, hint].filter(Boolean).join(' — '),
    desc: destination(link.url),
    css: sheen.css,
    defs: sheen.defs,
    body,
  });
}
