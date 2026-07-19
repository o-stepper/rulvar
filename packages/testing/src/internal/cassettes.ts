/**
 * Repository-internal cassette recording plumbing (the v1.23.0 review:
 * these symbols left the public root barrel). They serve the monorepo's
 * own recorder scripts (scripts/record-m2/m3/m6-cassettes.mjs), which
 * import this module by built-dist FILE PATH. The module is
 * deliberately absent from the package.json exports map, so no
 * published specifier reaches it and nothing here is public semver
 * surface; regenerating committed fixtures stays gated on the
 * hashVersion-bump changeset ceremony (M2-T12).
 */
export {
  buildFrozenV1JournalRaw,
  buildM2CassetteFixtures,
  buildV2GoldenIdentity,
} from '../cassettes/build-fixtures.js';
export type { CassetteFixture } from '../cassettes/build-fixtures.js';
export { recordLiveCassettes } from '../cassettes/record-live.js';
export {
  handlesInRequest,
  M6_ORCH_GOAL,
  M6_ORCH_PROFILES,
  M6_ORCH_RUN_ID,
  normalizeM6Entries,
  recordOrchestratorCrash,
} from '../cassettes/m6-orchestrator.js';
