[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishContractGoldenReject

# Interface: FinishContractGoldenReject

Defined in: [packages/core/src/orchestrator/output-contract.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L99)

One per validator reject golden (cycle 74): a fixture the NAMED
contract validator is proven to reject at construction time.
[selfTestFinishValidation](/api/@rulvar/core/functions/selfTestFinishValidation.md) holds the CONFIGURED validator of
that name against it, so a same-name replacement weaker than the
contract's own validator (a words minimum of one standing in for
three thousand) is caught before any provider call instead of
silently accepting what the journaled contract hash forbids.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-input"></a> `input` | `readonly` | [`FinishValidationInput`](/api/@rulvar/core/interfaces/FinishValidationInput.md) | The fixture that validator must reject. | [packages/core/src/orchestrator/output-contract.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L103) |
| <a id="property-validator"></a> `validator` | `readonly` | `string` | The contract validator this fixture targets, by name. | [packages/core/src/orchestrator/output-contract.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L101) |
