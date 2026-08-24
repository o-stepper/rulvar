[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / effectiveEffectState

# Function: effectiveEffectState()

```ts
function effectiveEffectState(machine): EffectMachineState;
```

Defined in: [packages/core/src/effects/fold.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L216)

The compensated overlay (see the module doc): 'compensated' when a
confirmed compensation cites a confirmed original, else the
machine's own state.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `machine` | [`EffectMachine`](/api/@rulvar/core/interfaces/EffectMachine.md) |

## Returns

[`EffectMachineState`](/api/@rulvar/core/type-aliases/EffectMachineState.md)
