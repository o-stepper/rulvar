[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / admitRunUnit

# Function: admitRunUnit()

```ts
function admitRunUnit(config, unit): Promise<() => Promise<void>>;
```

Defined in: `packages/core/dist/index.d.ts`

Admits one run unit: resolves when the ticket is granted (or when
the run signal aborts, after cancelling the ticket best effort),
throws the typed AdmissionRejectedError on the terminal denied
verdict, and returns the settle teardown (clear the renew timer,
release).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`EngineAdmissionConfig`](/api/@rulvar/rulvar/interfaces/EngineAdmissionConfig.md) |
| `unit` | [`AdmitRunUnitInput`](/api/@rulvar/rulvar/interfaces/AdmitRunUnitInput.md) |

## Returns

`Promise`\&lt;() =&gt; `Promise`\&lt;`void`\&gt;\>
