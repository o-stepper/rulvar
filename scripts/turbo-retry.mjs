// CI wrapper: run a turbo task, retry exactly once on failure, loudly.
//
// The one recurring CI flake this repo has is the tsdown pack step:
// the bundle itself builds green, then tsdown's attw/publint validation
// packs the package into /tmp/tsdown-pack-*/<name>-<version>.tgz and
// intermittently finds no tarball there (ENOENT). Observed on the
// executor build under Node 24 (run 32147458934, attempt 1) and earlier
// on the Node 26 lane; a rerun has fixed it every single time, because
// the race lives in the shared runner's /tmp under a dozen parallel
// tsdown pack subprocesses, not in this repository's sources. Upstream
// tracks pack-validation quirks (rolldown/tsdown#658) but not this race.
//
// The retry is safe by construction: turbo replays every package that
// already succeeded from cache, so the second attempt rebuilds only the
// package that flaked. A deterministic failure fails twice and the step
// stays red; the warning annotation names every run that needed the
// retry, so a flake that stops being rare stops being invisible.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/turbo-retry.mjs <turbo task and flags...>');
  process.exit(2);
}

function attempt() {
  const result = spawnSync('pnpm', ['exec', 'turbo', ...args], { stdio: 'inherit' });
  // A null status means the process died on a signal (e.g. a native
  // bundler crash); that is exactly the flake shape the retry is for.
  return result.status ?? 1;
}

const first = attempt();
if (first === 0) process.exit(0);

console.log(
  `::warning title=turbo ${args[0]} retried once::First attempt exited with ${first}; ` +
    'retrying once for the tsdown pack flake (see scripts/turbo-retry.mjs). ' +
    'A deterministic failure fails again below.',
);
process.exit(attempt());
