---
'@rulvar/anthropic': patch
'@rulvar/evals': patch
---

Two defects the first live M12 checkpoint run surfaced. The Anthropic capability table lacked a Haiku 4.5 entry, so the dated id fell through to the current-generation default and the adapter sent adaptive thinking, which that model rejects with a live 400 (every haiku run died at zero cost): `claude-haiku-4-5` (and its dated snapshots by the prefix rule) now resolves to the enabled-budget thinking form with real haiku pricing, meaning the default wire omits thinking entirely. And the checkpoint's criterion 2 could pass vacuously when both arms scored zero at zero cost (zero satisfies "at least equal at no more cost"): the card-informed arm must now win something real (nonzero n and pass rate) before the criterion can hold.
