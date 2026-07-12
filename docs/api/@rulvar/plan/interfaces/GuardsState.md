[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / GuardsState

# Interface: GuardsState

Defined in: [packages/plan/src/guards.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L67)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engaged"></a> `engaged?` | [`GuardFallback`](/api/@rulvar/plan/type-aliases/GuardFallback.md) | The engaged terminating fallback, once tripped (single-shot). | [packages/plan/src/guards.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L69) |
| <a id="property-frozensignatures"></a> `frozenSignatures` | `ReadonlySet`\&lt;`string`\&gt; | Coarse signatures whose re-adds are frozen. | [packages/plan/src/guards.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L71) |
| <a id="property-stallreplansused"></a> `stallReplansUsed` | `number` | - | [packages/plan/src/guards.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L72) |
