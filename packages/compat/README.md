# @rulvar/compat

Frozen key-derivation profiles for journal `hashVersions` that leave the
engine's support window, attached at engine construction through the
`extraDerivers` option so old journals stay resumable. Independently
versioned on purpose: its cadence follows the journal's compatibility
history, not engine feature releases. No real profile has aged out yet
at `CURRENT_HASH_VERSION = 2`, so today the package exports only
`deriverV0Synthetic`, a synthetic out-of-window profile that exercises
the compatibility path end to end; real profiles move in here when they
retire.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/compat
```

## Documentation

- [Journal compatibility](https://docs.rulvar.com/guide/journal-compatibility)
- [Versioning](https://docs.rulvar.com/reference/versioning)
- [API reference](https://docs.rulvar.com/api/%40rulvar/compat/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
