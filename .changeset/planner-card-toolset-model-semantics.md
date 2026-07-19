---
'@rulvar/planner': minor
---

Fix the API card's semantic contract for `tools`, `model`, and `routing` (the v1.23.0 review P2-1 and P2-2). The card now teaches that string entries of `tools` are registered TOOLSET names (exactly the set the profile card prints), never agent profile names, matching the runtime resolver that rejects unknown names with a typed ConfigError before any provider call. The `model` and `routing` bullets now say to normally omit both: the host's profiles and routing decide models, the profile card never names any (model secrecy is a design invariant), and the escape hatch is explicitly conditioned on the goal text itself supplying allowed refs; the false phrase "a model ref from the profile card" is gone. A ConfigError now also stays typed (`code: 'config'`) across the sandbox worker boundary instead of degrading to a generic error, so a compiled script that misuses a profile name in `tools` settles with the typed pre-call outcome and zero provider calls.

The card text is an identity input of plan operations, so the frozen planner cassettes are re-recorded under the hashVersion-bump token ceremony (the derivation itself is unchanged; CURRENT_HASH_VERSION stays 2).
