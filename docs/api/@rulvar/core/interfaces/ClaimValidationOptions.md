[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimValidationOptions

# Interface: ClaimValidationOptions

Defined in: [packages/core/src/knowledge/claims.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/claims.ts#L84)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-evalcommitter"></a> `evalCommitter?` | `boolean` | True on the eval-committer path (the eval-committer gate). Editorial validation leaves it false and both eval-measured claims and metrics reject. At the op level the GATE decides this flag; the option exists for direct claim-level validation. | [packages/core/src/knowledge/claims.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/claims.ts#L91) |
