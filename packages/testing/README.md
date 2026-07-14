# @rulvar/testing

The Rulvar test harness: `createTestEngine` and the deterministic
`FakeAdapter` for fast typed unit tests, VCR cassettes with secret
redaction, replay-strict runs that fail on any unexpected live call, and
matchers for Vitest and Jest. Also exports `record`, `replay`, and
`replayRun`.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add -D @rulvar/testing
```

## Documentation

- [Testing](https://docs.rulvar.com/guide/testing)
- [API reference](https://docs.rulvar.com/api/%40rulvar/testing/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
