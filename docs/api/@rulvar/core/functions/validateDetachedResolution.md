[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateDetachedResolution

# Function: validateDetachedResolution()

```ts
function validateDetachedResolution(
   target, 
   key, 
value): Promise<void>;
```

Defined in: [packages/core/src/engine/external.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L172)

The detached resolution validator (RV1408): classifies the target
entry exactly as the engine's own detached path does (a kind-'approval'
entry by its RV1203 flavor, an external by its kind), then applies the
shared payload arms and the pinned schema. Exported for offline
authorities (the CLI server's lease-guarded append is the first): an
escalation must resolve with its OWN EscalationDecision payload
offline exactly as detached-live, and a lookalike validator that
demanded the plain ApprovalDecision from every approval-kind entry
both refused legitimate escalation decisions and waved wrong-shaped
ones into the journal. Throws InvalidResolutionError; journals
nothing.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `key` | `string` |
| `value` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

## Returns

`Promise`\&lt;`void`\&gt;
