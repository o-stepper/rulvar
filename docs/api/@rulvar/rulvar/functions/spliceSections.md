[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / spliceSections

# Function: spliceSections()

```ts
function spliceSections(
   prior, 
   declared, 
   patch): string;
```

Defined in: `packages/core/dist/index.d.ts`

The deterministic host half of sectional bounded repair (RV808b): a
rejected finish used to resend the WHOLE document to fix one violated
section, and the twelfth comparison run paid its post-fan-in wall
exactly that way. This function reconstructs the full document from
the RETAINED prior attempt and a sectional resubmission. The grammar
is line anchored on purpose (the [SectionMatchMode](/api/@rulvar/rulvar/type-aliases/SectionMatchMode.md) 'line'
semantics): a section starts at the first line whose trimmed content
EQUALS a declared marker and runs to the next such marker line (any
declared marker) or the end of the text; the preamble before the
first marker is retained verbatim. A patched marker present in the
prior text has its whole section replaced by the marker line plus the
new body; a patched marker absent from the prior text is APPENDED at
the end in declared order (that is how a repair ADDS a section a
validator demanded). A patch naming an undeclared marker is a
ConfigError: the caller owns turning that into repair feedback.
Deterministic and pure, so a spliced exchange recounts identically on
replay; exported so custom hosts can stay symmetric with the
orchestrator runtime.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `prior` | `string` |
| `declared` | readonly `string`[] |
| `patch` | `Readonly`\&lt;`Record`\&lt;`string`, `string`\&gt;\&gt; |

## Returns

`string`
