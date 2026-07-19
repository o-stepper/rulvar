---
'@rulvar/testing': minor
---

Remove the repository-only cassette recording plumbing from the public root barrel (the v1.23.0 review): `buildFrozenV1JournalRaw`, `buildM2CassetteFixtures`, `buildV2GoldenIdentity`, `recordLiveCassettes`, and the M6 recording constants/helpers no longer appear in `dist/index.js` or `dist/index.d.ts`. They were `@internal` and absent from the API reference, yet importable and visible to every consumer's autocomplete, which read as public semver surface. They now live on an internal dist entry that the exports map never exposes; the monorepo's recorder scripts import it by file path. Per the documented versioning policy, `@internal` exports are outside the contract, so this rides a minor release. The supported tiers (FakeAdapter, createTestEngine, VCR, replay-strict, live smoke, matchers) are unchanged.
