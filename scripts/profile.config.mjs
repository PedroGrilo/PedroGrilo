// Hand-written content for the profile. Everything that is not live GitHub data lives here,
// so updating the profile means editing this one file.

export const profile = {
  login: 'PedroGrilo',
  name: 'Pedro Grilo',
  role: 'Senior Frontend Engineer',
  location: 'Lisbon, Portugal',
  site: 'https://grilo.net',
  // Lines typed one after another in the hero banner.
  taglines: [
    'I build fast, accessible interfaces with React, Vue.js and TypeScript.',
    'Real-time, collaborative map editors with CRDTs and WebSockets.',
    'After hours: Rust + Tauri desktop apps and Home Assistant hacks.',
  ],
  // Small facts shown as chips in the hero banner.
  facts: [
    { value: '6+', label: 'years shipping web apps' },
    { value: '19/20', label: 'MSc thesis grade' },
    { value: 'NOVA FCT', label: 'MSc Computer Science' },
  ],
};

export const links = [
  { id: 'portfolio', label: 'grilo.net', hint: 'Portfolio', url: 'https://grilo.net', icon: 'globe', primary: true },
  { id: 'linkedin', label: 'LinkedIn', hint: 'prxpgrilo', url: 'https://www.linkedin.com/in/prxpgrilo/', icon: 'linkedin' },
  { id: 'email', label: 'Email', hint: 'pedro@grilo.net', url: 'mailto:pedro@grilo.net', icon: 'mail' },
  { id: 'youtube', label: 'YouTube', hint: 'Kicas Edits', url: 'https://www.youtube.com/@ohsekkicas', icon: 'play' },
];

// Featured repositories, in display order. Stars / language / last push come from the API.
export const featured = [
  {
    repo: 'NASYNCLOUD',
    kind: 'Desktop app',
    pitch: 'Your NAS as an on-demand cloud drive: see every file, download only what you open.',
    tags: ['Rust', 'Tauri', 'WebDAV'],
  },
  {
    repo: 'vektor',
    kind: 'Desktop app',
    pitch: 'Windows and Counter-Strike 2 optimizer where every tweak runs locally and can be undone.',
    tags: ['Rust', 'Tauri', 'React'],
  },
  {
    repo: 'ha-fermax-duox-me',
    kind: 'Home Assistant integration',
    pitch: 'Fermax DuoxMe intercoms in Home Assistant: open doors, doorbell events and call photos.',
    tags: ['Python', 'HACS', 'Reverse engineering'],
  },
  {
    repo: 'ac-ha-card',
    kind: 'Home Assistant card',
    pitch: 'Climate card with a draggable 270° dial and an animated indoor unit, Daikin Onecta style.',
    tags: ['JavaScript', 'Web Components', 'HACS'],
  },
  {
    repo: 'shopping-list-plus-card',
    kind: 'Home Assistant card',
    pitch: 'A smarter shopping list: learned suggestions, automatic categories and quantity parsing.',
    tags: ['JavaScript', 'Web Components', 'HACS'],
  },
  {
    repo: 'immich-bulk-import',
    kind: 'Desktop app',
    pitch: 'A friendly macOS GUI around the Immich CLI for bulk photo uploads, no terminal needed.',
    tags: ['TypeScript', 'Electron', 'React'],
  },
];

// Tech stack, grouped. Rendered as one card.
export const stack = [
  { group: 'Frontend', items: ['React', 'TypeScript', 'Vue.js', 'Next.js', 'Tailwind CSS', 'Redux Toolkit'] },
  { group: 'Real-time & maps', items: ['WebSockets', 'WebRTC', 'Yjs & CRDTs', 'OpenLayers'] },
  { group: 'Desktop & systems', items: ['Rust', 'Tauri', 'Electron', 'Python'] },
  { group: 'Backend, when needed', items: ['Node.js', 'Java & Quarkus', 'PostgreSQL & PostGIS'] },
  { group: 'Testing & tooling', items: ['Vitest', 'Playwright', 'Vite', 'Docker', 'GitHub Actions'] },
  { group: 'Home lab', items: ['Home Assistant', 'HACS', 'Immich', 'NAS & WebDAV'] },
];

// Per-repository overrides for the repo snake (short label shown on the food pill).
export const snake = {
  maxRepos: 18,
  hidden: [], // repository names to leave out of the game
};
