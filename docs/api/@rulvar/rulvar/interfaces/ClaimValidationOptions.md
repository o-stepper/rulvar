[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimValidationOptions

# Interface: ClaimValidationOptions

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-evalcommitter"></a> `evalCommitter?` | `boolean` | True on the eval-committer path (the eval-committer gate; docs/05, 5.4). Editorial validation leaves it false and both eval-measured claims and metrics reject. At the op level the GATE decides this flag; the option exists for direct claim-level validation. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
