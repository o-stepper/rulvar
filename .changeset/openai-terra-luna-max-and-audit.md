---
'@rulvar/openai': minor
---

Canonical reasoning effort `max` now reaches the wire unchanged on every GPT-5.6 sibling: Terra and Luna join Sol with `wireMaxEffort: true`, each verified live (a max-effort Responses call returns 200 with the effort echoed, and the API's own 400 validator enumerates `max` among the supported values), closing the silent quality downgrade of the v1.20.0 review P2-3. Pre-5.6 families and unknown models keep the safe, visible downmap to `xhigh`. The adapter also declares `usageSemantics: 'openai-cache-subsets-v2'`, stamped onto usage-bearing journal entries so the cache-accounting semantics ride the journal alongside the numbers, and new exports `undoV1190CacheDoubleCount` and `auditV1190CacheJournal` provide the exact opt-in sidecar inversion for journals recorded by v1.19.0, whose adapter double-counted cache writes (v1.20.0 review P1/P2-2). Numeric hygiene stays with the core boundary validator by design; the normalizer maps wire shape only.
