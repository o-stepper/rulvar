---
'@rulvar/openai': minor
---

An affirmatively declared empty claim is not settlement evidence (RV1201). A per-request statement row whose `usage` or `componentsUsd` was an object with no figures used to read verdict `match` with complete coverage and `settleable: true` on the object's mere presence, exactly the false settlement-grade evidence the sixteenth experiment's judge reproduced as R1: `{usage:{}}` and `{componentsUsd:{}}` both settled. The intake now refuses such a row with a typed `ConfigError` naming the row and the empty field, at the same fail-closed gate that already refuses non-finite dollars, malformed token counts, and self-contradicting rows. The documented partial-declaration model is unchanged: a row declaring only its `responseId` still joins the coverage set, because presence is coverage, not a figure claim; and a single declared figure (one token count, one component line) remains evidence exactly as before.
