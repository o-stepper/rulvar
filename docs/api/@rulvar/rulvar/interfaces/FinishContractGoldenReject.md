[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishContractGoldenReject

# Interface: FinishContractGoldenReject

Defined in: `packages/core/dist/index.d.ts`

One per validator reject golden (cycle 74): a fixture the NAMED
contract validator is proven to reject at construction time.
[selfTestFinishValidation](/api/@rulvar/rulvar/functions/selfTestFinishValidation.md) holds the CONFIGURED validator of
that name against it, so a same-name replacement weaker than the
contract's own validator (a words minimum of one standing in for
three thousand) is caught before any provider call instead of
silently accepting what the journaled contract hash forbids.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-input"></a> `input` | `readonly` | [`FinishValidationInput`](/api/@rulvar/rulvar/interfaces/FinishValidationInput.md) | The fixture that validator must reject. | `packages/core/dist/index.d.ts` |
| <a id="property-validator"></a> `validator` | `readonly` | `string` | The contract validator this fixture targets, by name. | `packages/core/dist/index.d.ts` |
