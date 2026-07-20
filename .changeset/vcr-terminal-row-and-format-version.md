---
'@rulvar/testing': minor
---

A VCR cassette row is now always the record of one completed exchange, and `readCassette` validates the cassette format version (v1.28.0 review P2 and P3).

`record` appends a row only when the wrapped stream delivered exactly one terminal event: a requested abort and a naturally truncated stream (no terminal), a thrown wire failure, and a contract violating stream (a second terminal or data after the terminal) append nothing. The v1.28.0 behavior that made the append unconditional on a clean generator exit could commit a partial, finish less exchange, which the fail closed core would then replay as a transport error; the intent of that fix is preserved, because a consumer that stops consuming right after the terminal (the engine shape) still commits its row.

`readCassette` now refuses a cassette whose header does not declare format `v: 1` with a typed `ConfigError`, instead of silently interpreting an unknown future format as v1 (`hashVersion`, checked by replay, gates request identity and never substitutes for the format version). Corrupt JSON lines and rows missing their required fields also throw a typed `ConfigError` naming the cassette path and line, so a torn cassette fails loudly before any partial replay.
