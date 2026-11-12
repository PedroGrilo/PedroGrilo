// Fetches everything the generators need from the GitHub GraphQL API in one request.
// Only public, non-fork repositories owned by the user are read.

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    login
    name
    createdAt
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        name
        description
        url
        homepageUrl
        stargazerCount
        forkCount
        isArchived
        createdAt
        pushedAt
        primaryLanguage { name color }
        languages(first: 12, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount contributionLevel date weekday } }
      }
    }
  }
}`;

// Languages that are build output / vendored noise rather than something Pedro wrote.
export const IGNORED_LANGUAGES = new Set([
  'HLSL', 'ShaderLab', 'ASP', 'ASP.NET', 'GLSL', 'NSIS', 'Objective-C', 'Batchfile', 'Makefile', 'Dockerfile',
]);

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

export async function fetchProfile(login, token) {
  if (!token) {
    throw new Error('Missing GitHub token: set GITHUB_TOKEN (locally: GITHUB_TOKEN=$(gh auth token) node scripts/generate.mjs).');
  }
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'profile-readme-generator',
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`GitHub API error: ${JSON.stringify(json.errors)}`);
  if (!json.data?.user) throw new Error(`GitHub user "${login}" not found`);
  return normalize(json.data.user);
}

export function normalize(user) {
  const repos = user.repositories.nodes
    .filter((r) => r.name.toLowerCase() !== user.login.toLowerCase()) // skip the profile repo itself
    .map((r) => ({
      name: r.name,
      description: r.description ?? '',
      url: r.url,
      homepage: r.homepageUrl ?? '',
      stars: r.stargazerCount,
      forks: r.forkCount,
      archived: r.isArchived,
      createdAt: r.createdAt,
      pushedAt: r.pushedAt,
      language: r.primaryLanguage?.name ?? null,
      color: r.primaryLanguage?.color ?? null,
      languages: r.languages.edges.map((e) => ({ name: e.node.name, color: e.node.color, size: e.size })),
    }));

  const cal = user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks.map((w) =>
    w.contributionDays.map((d) => ({
      date: d.date,
      weekday: d.weekday,
      count: d.contributionCount,
      level: LEVELS[d.contributionLevel] ?? 0,
    })),
  );

  const cc = user.contributionsCollection;
  return {
    login: user.login,
    name: user.name ?? user.login,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    repos,
    languages: languageShare(repos),
    calendar: { total: cal.totalContributions, weeks, ...streaks(weeks) },
    totals: {
      repos: repos.length,
      stars: repos.reduce((sum, r) => sum + r.stars, 0),
      commits: cc.totalCommitContributions,
      pullRequests: cc.totalPullRequestContributions,
      issues: cc.totalIssueContributions,
      contributedRepos: cc.totalRepositoriesWithContributedCommits,
    },
  };
}

/**
 * Language share where every repository counts the same ("one repo, one vote", split by bytes
 * inside the repo). Raw byte totals would be dominated by a single vendored folder.
 */
export function languageShare(repos) {
  const share = new Map();
  let votes = 0;
  for (const repo of repos) {
    const langs = repo.languages.filter((l) => !IGNORED_LANGUAGES.has(l.name));
    const bytes = langs.reduce((sum, l) => sum + l.size, 0);
    if (!bytes) continue;
    votes += 1;
    for (const l of langs) {
      const entry = share.get(l.name) ?? { name: l.name, color: l.color ?? '#8b98a9', weight: 0, repos: 0 };
      entry.weight += l.size / bytes;
      if (l.size / bytes >= 0.1) entry.repos += 1;
      share.set(l.name, entry);
    }
  }
  return [...share.values()]
    .map((l) => ({ ...l, pct: votes ? (l.weight / votes) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);
}

/** Longest and current streak (in days) plus the busiest day of the last year. */
export function streaks(weeks) {
  const days = weeks.flat().sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let run = 0;
  let best = { date: null, count: 0 };
  let activeDays = 0;
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
    if (day.count > best.count) best = { date: day.date, count: day.count };
    if (day.count > 0) activeDays += 1;
  }
  // Current streak: count back from the last day; an empty "today" does not break it yet.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].count > 0) current += 1;
    else if (i === days.length - 1) continue;
    else break;
  }
  return { longestStreak: longest, currentStreak: current, bestDay: best, activeDays };
}
