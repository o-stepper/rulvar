[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / OtelContextApi

# Interface: OtelContextApi

Defined in: [packages/cli/src/otel.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L51)

Minimal OTel context surface (setSpan/with) for parentage.

## Methods

### active()

```ts
active(): unknown;
```

Defined in: [packages/cli/src/otel.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L52)

#### Returns

`unknown`

***

### with()

```ts
with<T>(context, fn): T;
```

Defined in: [packages/cli/src/otel.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L53)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | `unknown` |
| `fn` | () => `T` |

#### Returns

`T`
