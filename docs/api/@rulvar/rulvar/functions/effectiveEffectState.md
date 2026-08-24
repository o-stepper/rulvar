[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / effectiveEffectState

# Function: effectiveEffectState()

```ts
function effectiveEffectState(machine): EffectMachineState;
```

Defined in: `packages/core/dist/index.d.ts`

The compensated overlay (see the module doc): 'compensated' when a
confirmed compensation cites a confirmed original, else the
machine's own state.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `machine` | [`EffectMachine`](/api/@rulvar/rulvar/interfaces/EffectMachine.md) |

## Returns

[`EffectMachineState`](/api/@rulvar/rulvar/type-aliases/EffectMachineState.md)
