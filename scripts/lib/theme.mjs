// Shared design tokens + tiny SVG helpers for every generated profile asset.
// Every asset is rendered twice (dark + light) and swapped in the README with <picture>.

export const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
export const FONT_MONO =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/** Width shared by all full-width assets (GitHub scales them down to the README column). */
export const WIDTH = 880;

export const THEMES = {
  dark: {
    name: 'dark',
    panel: '#0d1117', // card surface (matches GitHub dark canvas)
    panelAlt: '#111a24', // raised surface inside a card
    grid: '#161f2b', // empty board cell
    border: '#263241',
    text: '#e6edf3',
    muted: '#8b98a9',
    faint: '#5b6878',
    accent: '#3ddc84', // "grilo" green
    accentSoft: '#1f6f4a',
    accent2: '#2dd4bf', // teal
    accent3: '#facc15', // food / highlight
    danger: '#ff7b72',
    glow: 0.55,
    // contribution levels 0..4
    levels: ['#161f2b', '#0e4429', '#006d32', '#26a641', '#39d353'],
  },
  light: {
    name: 'light',
    panel: '#ffffff',
    panelAlt: '#f6f8fa',
    grid: '#eaeef2',
    border: '#d0d7de',
    text: '#1f2328',
    muted: '#59636e',
    faint: '#818b98',
    accent: '#1a7f37',
    accentSoft: '#aceebb',
    accent2: '#0e7490',
    accent3: '#bf8700',
    danger: '#cf222e',
    glow: 0.25,
    levels: ['#eaeef2', '#aceebb', '#4ac26b', '#2da44e', '#116329'],
  },
};

/** Escape text for use inside SVG text nodes / attributes. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Round to 2 decimals and drop trailing zeros — keeps generated SVGs small and diff-friendly. */
export function n(value) {
  return String(Math.round(value * 100) / 100);
}

// Advance widths in em, bucketed from real measurements (system UI font blended with Arial).
// Precise enough to size pills and columns; add `textLength` where the width must be exact.
const GLYPH_WIDTHS = [
  [0.21, "ijl'"], [0.25, 'I .,:;!'], [0.3, 'frt/'], [0.35, '()'], [0.4, '-°'],
  [0.5, '1cksvxyzJ?'], [0.6, '04689EPTZ+#'], [0.65, 'ABKRSVXY&'], [0.7, 'wCDHNU'],
  [0.75, 'GOQ'], [0.8, 'm'], [0.85, 'M%'], [0.95, 'W@'], [1, '…'],
];
const GLYPH_EM = new Map(GLYPH_WIDTHS.flatMap(([em, chars]) => [...chars].map((c) => [c, em])));
const WEIGHT_SCALE = { 400: 1, 500: 1.03, 600: 1.055, 700: 1.07, 800: 1.09, 900: 1.1 };
export const MONO_EM = 0.602; // advance of the monospace stack

/**
 * Estimated text width (no DOM available at build time).
 * Sans text uses the glyph table above; monospace text is exact up to the font's advance.
 */
export function textWidth(text, fontSize, { mono = false, bold = false, weight } = {}) {
  const str = String(text ?? '');
  if (mono) return [...str].length * fontSize * MONO_EM;
  let em = 0;
  for (const char of str) em += GLYPH_EM.get(char) ?? 0.55;
  return em * fontSize * (WEIGHT_SCALE[weight ?? (bold ? 700 : 400)] ?? 1);
}

/** Truncate with an ellipsis so that the estimated width fits maxWidth. */
export function fit(text, fontSize, maxWidth, opts) {
  let out = String(text ?? '');
  if (textWidth(out, fontSize, opts) <= maxWidth) return out;
  while (out.length > 1 && textWidth(out + '…', fontSize, opts) > maxWidth) out = out.slice(0, -1);
  return out.trimEnd() + '…';
}

/** Greedy word-wrap into at most maxLines lines (last line is ellipsised). */
export function wrap(text, fontSize, maxWidth, maxLines = 2, opts) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, fontSize, opts) <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fit(`${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, fontSize, maxWidth, opts);
    return kept;
  }
  return lines.map((l) => fit(l, fontSize, maxWidth, opts));
}

/**
 * Wrap body markup in a complete, self-contained SVG document.
 * `title`/`desc` make the image accessible; animations stop for prefers-reduced-motion.
 */
export function svgDoc({ width, height, title, desc = '', css = '', defs = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>
text{font-family:${FONT_SANS}}
.mono{font-family:${FONT_MONO}}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
<defs>${defs}</defs>
${body}
</svg>
`;
}

/** Rounded card surface with a hairline border. */
export function panel(theme, { x = 0.5, y = 0.5, width, height, radius = 14, fill }) {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(width - 1)}" height="${n(height - 1)}" rx="${radius}" fill="${fill ?? theme.panel}" stroke="${theme.border}"/>`;
}

/** Compact number formatting: 1234 -> 1.2k */
export function compact(value) {
  const v = Number(value) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(v);
}
