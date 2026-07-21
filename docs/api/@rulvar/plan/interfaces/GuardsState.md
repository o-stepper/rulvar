[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / GuardsState

# Interface: GuardsState

Defined in: [packages/plan/src/guards.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L89)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engaged"></a> `engaged?` | [`GuardFallback`](/api/@rulvar/plan/type-aliases/GuardFallback.md) | The engaged terminating fallback, once tripped (single-shot). | [packages/plan/src/guards.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L91) |
| <a id="property-frozensignatures"></a> `frozenSignatures` | `ReadonlySet`\&lt;`string`\&gt; | Coarse signatures whose re-adds are frozen. | [packages/plan/src/guards.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L93) |
| <a id="property-stallreplansused"></a> `stallReplansUsed` | `number` | - | [packages/plan/src/guards.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L94) |
