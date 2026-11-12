// Tech stack card: the groups of profile.config.mjs laid out on a 3-column grid (as many rows as
// needed). Each group has a mono micro-label and its items as chips that wrap inside the column.
// Motion: a soft accent "scan" visits the chips one by one (like the snake passing through the
// toolbox), then rests. At t=0 and with reduced motion every chip is already fully drawn.

import { WIDTH, esc, n, panel, svgDoc, textWidth, fit } from './theme.mjs';

const COLUMNS = 3;
const PAD_X = 28;
const PAD_TOP = 30;
const PAD_BOTTOM = 30;
const COLUMN_GAP = 28;
const ROW_GAP = 30; // between grid rows (bottom of the tallest chip block to the next label)

const LABEL_SIZE = 11;
const LABEL_TRACKING = 1.3;
const MONO_EM = 0.602;
const LABEL_TO_CHIPS = 22; // row top (label cap height) to the top of the first chip row

const CHIP_H = 28;
const CHIP_PAD = 11;
const CHIP_GAP = 8; // horizontal and vertical gap between chips
const CHIP_TEXT = 13;
const CHIP_RADIUS = 8;

// Scan timing: every chip lights up for SCAN_GLOW seconds, STEP apart, then the card rests.
const STEP = 0.32;
const SCAN_GLOW = 1.1;
const REST = 6;

/** Truncate an uppercase mono label (fixed advance + tracking per character). */
function fitLabel(text, maxWidth) {
  const maxChars = Math.floor(maxWidth / (LABEL_SIZE * MONO_EM + LABEL_TRACKING));
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

/** Place the chips of one group inside a column, wrapping to new lines. Returns chips + height. */
function layoutChips(items, columnWidth) {
  const chips = [];
  let x = 0;
  let y = 0;
  for (const item of items) {
    const label = fit(item, CHIP_TEXT, columnWidth - CHIP_PAD * 2);
    const textW = textWidth(label, CHIP_TEXT);
    const width = Math.ceil(textW + CHIP_PAD * 2);
    if (x > 0 && x + width > columnWidth) {
      x = 0;
      y += CHIP_H + CHIP_GAP;
    }
    chips.push({ label, textW, width, x, y });
    x += width + CHIP_GAP;
  }
  return { chips, height: chips.length ? y + CHIP_H : 0 };
}

/** Layout of the whole card: one cell per group, row heights from the tallest cell in the row. */
function layoutGrid(stack) {
  const columnWidth = (WIDTH - PAD_X * 2 - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS;
  const cells = stack.map((group, i) => ({
    group,
    col: i % COLUMNS,
    row: Math.floor(i / COLUMNS),
    ...layoutChips(group.items ?? [], columnWidth),
  }));
  const rowCount = Math.ceil(cells.length / COLUMNS);
  const rowTops = [];
  let y = PAD_TOP;
  for (let row = 0; row < rowCount; row += 1) {
    rowTops.push(y);
    const tallest = Math.max(0, ...cells.filter((c) => c.row === row).map((c) => c.height));
    y += LABEL_TO_CHIPS + tallest + (row < rowCount - 1 ? ROW_GAP : 0);
  }
  return { cells, rowTops, columnWidth, height: y + PAD_BOTTOM };
}

/** Group heading: a small rounded "pixel" in the accent colour, then the mono label. */
function groupLabel(cell, x, y, columnWidth, theme) {
  const text = fitLabel(String(cell.group.group ?? '').toUpperCase(), columnWidth - 14);
  return [
    `<rect x="${n(x)}" y="${n(y - 7.5)}" width="7" height="7" rx="2" fill="${theme.accent}"/>`,
    `<text class="mono" x="${n(x + 14)}" y="${n(y)}" font-size="${LABEL_SIZE}" letter-spacing="${LABEL_TRACKING}" fill="${theme.accent}">${esc(text)}</text>`,
  ].join('');
}

/** One chip: surface, label (pinned with textLength) and the accent ring used by the scan. */
function chip(c, x, y, order, cycle, theme) {
  const cx = x + c.x;
  const cy = y + c.y;
  const box = `x="${n(cx + 0.5)}" y="${n(cy + 0.5)}" width="${c.width - 1}" height="${CHIP_H - 1}" rx="${CHIP_RADIUS}"`;
  // SMIL: the ring is invisible until its turn (begin), fades in/out over SCAN_GLOW, then waits
  // for the rest of the cycle. Every ring shares the same duration, so the order never drifts.
  const rise = n((SCAN_GLOW * 0.35) / cycle);
  const fall = n(SCAN_GLOW / cycle);
  return [
    `<rect ${box} fill="${theme.panelAlt}" stroke="${theme.border}"/>`,
    `<rect class="scan" ${box} fill="${theme.accent}" fill-opacity="0.1" stroke="${theme.accent}" opacity="0">` +
      `<animate attributeName="opacity" values="0;1;0;0" keyTimes="0;${rise};${fall};1" dur="${n(cycle)}s" begin="${n(order * STEP)}s" repeatCount="indefinite"/></rect>`,
    `<text x="${n(cx + CHIP_PAD)}" y="${n(cy + CHIP_H / 2 + 4.5)}" font-size="${CHIP_TEXT}" fill="${theme.text}" textLength="${n(c.textW)}">${esc(c.label)}</text>`,
  ].join('');
}

/** Length of one scan cycle in seconds: every chip once, then a calm pause. */
function scanCycle(chipCount) {
  return chipCount * STEP + SCAN_GLOW + REST;
}

// SMIL ignores prefers-reduced-motion, so the rings are simply removed for those viewers.
const REDUCED_MOTION_CSS = '@media (prefers-reduced-motion:reduce){.scan{display:none}}';

/**
 * Render the stack card.
 * @param {{group: string, items: string[]}[]} stack
 * @param {object} theme one of THEMES
 */
export function renderStack(stack, theme) {
  const { cells, rowTops, columnWidth, height } = layoutGrid(stack ?? []);
  const body = [panel(theme, { width: WIDTH, height })];
  const cycle = scanCycle(cells.reduce((sum, cell) => sum + cell.chips.length, 0));
  let order = 0;
  for (const cell of cells) {
    const x = PAD_X + cell.col * (columnWidth + COLUMN_GAP);
    const top = rowTops[cell.row];
    body.push(groupLabel(cell, x, top + LABEL_SIZE - 2, columnWidth, theme));
    for (const c of cell.chips) body.push(chip(c, x, top + LABEL_TO_CHIPS, order++, cycle, theme));
  }
  // Hairline between grid rows keeps the groups calm and scannable.
  for (const top of rowTops.slice(1)) {
    body.push(`<line x1="${PAD_X}" x2="${WIDTH - PAD_X}" y1="${n(top - ROW_GAP / 2)}" y2="${n(top - ROW_GAP / 2)}" stroke="${theme.border}" stroke-dasharray="2 4"/>`);
  }
  const names = (stack ?? []).map((g) => `${g.group}: ${(g.items ?? []).join(', ')}`).join('. ');
  return svgDoc({
    width: WIDTH,
    height,
    title: 'Tech stack',
    desc: names,
    css: REDUCED_MOTION_CSS,
    body: body.join('\n'),
  });
}
