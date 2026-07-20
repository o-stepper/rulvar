---
'@rulvar/openai': patch
'@rulvar/anthropic': patch
---

`Retry-After` accepts HTTP optional whitespace padding only. ECMAScript `trim()` removed far more than the OWS production (space and horizontal tab), so values padded with newline, carriage return, vertical tab, form feed, or NBSP were honored as delays despite the documented exact delta seconds grammar; a real HTTP transport rejects most of those octets, but an injected SDK client or a mock does not. Both first party adapters now match `/^[\t ]*([0-9]+)[\t ]*$/` and fall back to the computed policy backoff for every other form.
