[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / readCassette

# Function: readCassette()

```ts
function readCassette(path): VcrCassette;
```

Defined in: [packages/testing/src/vcr.ts:558](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L558)

Parses a cassette file (one header line plus one JSON row per line).
The header must declare cassette format `v: 1`: the format version
gates parsing itself, while hashVersion (whose support window is
checked by replay) only gates request identity and never
substitutes for it, so a future incompatible format refuses loudly
instead of being read as v1. Every documented header field (kind,
v, an integer hashVersion, a date string recordedAt) and row field
(adapterId, model, requestHash, request, caps, events, an optional
string provider, an optional nonempty usageSemantics, an optional
nonnegative integer occurrence) is checked
here, and the nested structures are validated in depth (v1.30.0
review P3): the request must be a plain object, every event must
be a member of the canonical ChatEvent vocabulary with its
required payload and Usage numeric invariants, and caps must carry
every ModelCaps field (with the optional pricing table checked
when present). Unknown extra FIELDS are tolerated for forward
compatibility. Event stream SEMANTICS (one trailing terminal per
row) and adapter consistency across rows (provider,
usageSemantics, caps agreement) are deliberately not checked at
read time; `replay` enforces them before serving anything (v1.29.0
review P3), so reading never blocks inspecting a well formed file.
Parse and shape failures throw a typed ConfigError naming the
cassette path and line (v1.28.0 review P3).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

## Returns

[`VcrCassette`](/api/@rulvar/testing/interfaces/VcrCassette.md)
