---
'@rulvar/testing': minor
---

Cassette event validation now covers every constrained nested field of the canonical vocabulary (v1.31.0 review P3). Three shapes the documentation already promised to refuse were accepted by `readCassette` and `replay`: a `tool-call-end` without its `args` (required payload; any JSON value including `null` is valid, absence is not, because the replayed event would differ from what the live adapter emitted), a refusal `stopDetails` that is not a plain object or whose present `type`, `category`, or `explanation` is not a string, and a finish `providerMetadata` that is not a plain object. All three now refuse with a typed `ConfigError` naming the JSONL line and the exact field path.
