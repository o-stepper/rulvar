---
'@lurker/testing': minor
---

M5-T04 VCR cassettes and cron contract tests. `@lurker/testing` gains
the tier-2 VCR at the adapter boundary: `record({ adapters, cassette,
redact? })` wraps live adapters and appends redacted JSONL rows keyed by
a hash of the canonical wire-contract request (the engine-populated
providerOptions.lurker telemetry namespace is excluded from the key);
`replay({ cassette, onMiss })` serves recorded streams back with the
typed VcrMissError under 'throw' (hermetic CI) or live forwarding under
'passthrough'. Redaction happens at record time: the built-in policy
masks authorization material (key-shaped strings, bearer tokens,
api-key assignments) in every stored string and a custom hook composes
on top, so secrets never reach cassette bytes. Cassette headers record
the hashVersion they were produced under (DEF-6), and replay adapters
expose the recorded caps snapshots. The live contract-test cron
workflow is now real: weekly, non-blocking, gated on the
CONTRACT_TESTS_ENABLED variable and provider keys, validating the wire
contract (one terminal event, Usage invariant, finish vocabulary)
against committed provider cassettes and opening a contract-drift issue
on failure instead of rerecording.
