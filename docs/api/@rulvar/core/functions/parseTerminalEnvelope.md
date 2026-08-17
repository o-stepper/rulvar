[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / parseTerminalEnvelope

# Function: parseTerminalEnvelope()

```ts
function parseTerminalEnvelope(value): TerminalEnvelope;
```

Defined in: [packages/core/src/l0/terminal-envelope.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/terminal-envelope.ts#L236)

The runtime gate over the terminal envelope contract (RV3903, the
fourth comparison experiment). `terminalEnvelopeOf` is the ONE
producer, but a producer is a compile-time promise, and the envelope
crosses trust boundaries the type system never sees: a journal read
back after a restart, a plain JS caller, an HTTP body a pipeline
gates on. The experiment probed the built dist and the typed copy
accepted `status: 'green'`, NaN dollars, and negative counts without
a sound; a finance or compliance consumer downstream would have
gated a run on fiction.

The gate validates the CONTRACT fields and refuses with a typed
[ConfigError](/api/@rulvar/core/classes/ConfigError.md) naming the field and the defect: enum `status`
and `completion`, finite nonnegative money (with `totalUsd <=
grossUsd`, gross being net plus abandoned by construction), usage
and counters, `settledReason` only beside `settled: false`, the
`costBasis` and `provenance` literals, boolean `usageApprox`, and
the `WireError` shape when an error rides along. Unknown top-level
fields pass through untouched: the contract evolves additively, and
a parser that refused tomorrow's field would turn every additive
release into a wire break. On success the SAME reference comes back,
typed: the gate is a boundary check, never a normalizer.

Wired where external bytes actually enter: `persistedTerminalEnvelope`
runs every journal-rebuilt envelope through it (and refuses typed as
`malformed-envelope`), which also covers the server's persisted
serving by construction. The live settlement chokepoint stays
unparsed on purpose: it is the one producer inside one process, and
gating it would add a throw site to settlement itself.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

## Returns

[`TerminalEnvelope`](/api/@rulvar/core/interfaces/TerminalEnvelope.md)
