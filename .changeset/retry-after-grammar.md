---
'@rulvar/openai': patch
'@rulvar/anthropic': patch
---

Parse `Retry-After` under the exact RFC delta seconds grammar (v1.29.0 review P3). Published 1.29.0 used `Number(header)`, which accepted far more than the documented delta seconds form: an empty or whitespace header became a 0 ms delay (an instant retry instead of the policy backoff), and hex (`0x10`), exponent (`1e3`), decimal (`1.5`), and signed (`+3`) forms were honored as delays. The value must now be a nonempty run of decimal digits after optional whitespace; every other form (the HTTP date included) omits `retryAfterMs` so the engine's computed backoff applies, and a huge digit run still clamps to the Node timer maximum.
