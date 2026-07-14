[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / CassetteTurn

# Interface: CassetteTurn

Defined in: [packages/plan/src/cassettes.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L83)

A minimal scripted adapter over the PUBLIC provider SPI.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-awaitpromise"></a> `awaitPromise?` | `Promise`\&lt;`void`\&gt; | Await this promise before emitting (cross-agent sequencing). | [packages/plan/src/cassettes.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L88) |
| <a id="property-hanguntilaborted"></a> `hangUntilAborted?` | `boolean` | - | [packages/plan/src/cassettes.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L86) |
| <a id="property-text"></a> `text?` | `string` | - | [packages/plan/src/cassettes.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L84) |
| <a id="property-toolcall"></a> `toolCall?` | \{ `args`: `unknown`; `name`: `string`; \} | - | [packages/plan/src/cassettes.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L85) |
| `toolCall.args` | `unknown` | - | [packages/plan/src/cassettes.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L85) |
| `toolCall.name` | `string` | - | [packages/plan/src/cassettes.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L85) |
| <a id="property-wireerror"></a> `wireError?` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) | The stream terminates with this typed wire error (M9 DEF-2/3 rows). | [packages/plan/src/cassettes.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L90) |
