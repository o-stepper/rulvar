---
'@rulvar/planner': minor
---

The API card now tells the planner the truth about identical calls and the complete sanctioned option set (v1.22.0 review P2-4). The card claimed identical calls "journal as ONE result"; the ordinal semantics have always been the opposite: every call journals as its own operation, identical calls share a content key but take sequential ordinals, and repeats always run. The card now states exactly that, plus why a distinguishing `key` still matters (it binds each result to its call by identity instead of position across script edits). The agent opts line is now GENERATED from the runtime allowlist (`SANDBOX_AGENT_OPT_KEYS`, newly exported from `@rulvar/core`), which also surfaces the three options the hand-maintained list had silently dropped: `routing`, `memoizeOutcome`, and `replay`, each with a one-line explanation the model can act on. A parity test pins the card to the runtime allowlist in both directions.

Identity note (hashVersion-bump ceremony): the card text is an input of the planner operation's content key, so the frozen `planner-self-repair` cassette is re-recorded under the new prompt bytes. The key DERIVATION and `CURRENT_HASH_VERSION` are unchanged; committed journals recorded under the old card replay byte-exact, and only a fresh `plan()` call sees the new prompt identity.
