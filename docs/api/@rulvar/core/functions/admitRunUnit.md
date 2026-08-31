[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / admitRunUnit

# Function: admitRunUnit()

```ts
function admitRunUnit(config, unit): Promise<() => Promise<void>>;
```

Defined in: [packages/core/src/admission/engine-bracket.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L111)

Admits one run unit: resolves when the ticket is granted (or when
the run signal aborts, after cancelling the ticket best effort),
throws the typed AdmissionRejectedError on the terminal denied
verdict, and returns the settle teardown (clear the renew timer,
release).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`EngineAdmissionConfig`](/api/@rulvar/core/interfaces/EngineAdmissionConfig.md) |
| `unit` | [`AdmitRunUnitInput`](/api/@rulvar/core/interfaces/AdmitRunUnitInput.md) |

## Returns

`Promise`\&lt;() =&gt; `Promise`\&lt;`void`\&gt;\>
