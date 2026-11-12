#!/usr/bin/env node
// Generates every SVG used by the profile README into ./dist (dark + light variant of each).
//
//   GITHUB_TOKEN=$(gh auth token) node scripts/generate.mjs
//
// Options:
//   --out <dir>     output directory (default: dist)
//   --data <file>   render from a saved JSON snapshot instead of calling the GitHub API
//   --dump <file>   save the fetched data as a JSON snapshot (handy for offline design work)
//   --only <names>  comma separated asset groups: hero,links,projects,stack,snake,stats

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchProfile } from './lib/github.mjs';
import { THEMES } from './lib/theme.mjs';
import { featured, links, profile, snake, stack } from './profile.config.mjs';

if (Number(process.versions.node.split('.')[0]) < 20) {
  throw new Error(`Node.js 20 or newer is required (found ${process.versions.node}).`);
}

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.out ?? 'dist');
const only = args.only ? new Set(args.only.split(',').map((s) => s.trim())) : null;
const wants = (group) => !only || only.has(group);

const data = args.data
  ? JSON.parse(await readFile(args.data, 'utf8'))
  : await fetchProfile(profile.login, process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN);
if (args.dump) await writeFile(args.dump, JSON.stringify(data, null, 2));

await mkdir(outDir, { recursive: true });
const written = [];

/** Render one asset for both themes: name-dark.svg and name-light.svg */
async function emit(name, render) {
  for (const theme of Object.values(THEMES)) {
    const file = `${name}-${theme.name}.svg`;
    await writeFile(path.join(outDir, file), render(theme));
    written.push(file);
  }
}

if (wants('hero')) {
  const { renderHero } = await import('./lib/hero.mjs');
  await emit('hero', (theme) => renderHero(profile, data, theme));
}

if (wants('links')) {
  const { renderLink } = await import('./lib/links.mjs');
  for (const link of links) await emit(`link-${link.id}`, (theme) => renderLink(link, theme));
}

if (wants('projects')) {
  const { renderProjectCard } = await import('./lib/projects.mjs');
  for (const item of featured) {
    const repo = data.repos.find((r) => r.name.toLowerCase() === item.repo.toLowerCase());
    if (!repo) {
      console.warn(`! featured repo "${item.repo}" not found among public repositories, skipping`);
      continue;
    }
    await emit(`project-${repo.name.toLowerCase()}`, (theme) => renderProjectCard(item, repo, theme));
  }
}

if (wants('stack')) {
  const { renderStack } = await import('./lib/stack.mjs');
  await emit('stack', (theme) => renderStack(stack, theme));
}

if (wants('snake')) {
  const { renderRepoSnake } = await import('./lib/snake.mjs');
  await emit('repo-snake', (theme) => renderRepoSnake(data, snake, theme));
}

if (wants('stats')) {
  const { renderStats, renderLanguages } = await import('./lib/stats.mjs');
  await emit('stats', (theme) => renderStats(data, theme));
  await emit('languages', (theme) => renderLanguages(data, theme));
}

console.log(`Wrote ${written.length} files to ${path.relative(process.cwd(), outDir) || '.'}`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    out[key] = value;
    i += 1;
  }
  return out;
}
