[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ExecutorConformanceSuite

# Interface: ExecutorConformanceSuite

Defined in: [packages/executor/src/conformance.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L49)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-checks"></a> `checks` | readonly [`ExecutorConformanceCheck`](/api/@rulvar/executor/interfaces/ExecutorConformanceCheck.md)[] | [packages/executor/src/conformance.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L51) |
| <a id="property-name"></a> `name` | `string` | [packages/executor/src/conformance.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L50) |

## Methods

### run()

```ts
run(): Promise<void>;
```

Defined in: [packages/executor/src/conformance.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L52)

#### Returns

`Promise`\&lt;`void`\&gt;
