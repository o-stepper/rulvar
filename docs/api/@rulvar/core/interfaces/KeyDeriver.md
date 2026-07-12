[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / KeyDeriver

# Interface: KeyDeriver

Defined in: [packages/core/src/journal/keyderiver.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L38)

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dispositiontable"></a> `dispositionTable` | `readonly` | [`DispositionTable`](/api/@rulvar/core/type-aliases/DispositionTable.md) | [packages/core/src/journal/keyderiver.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L45) |
| <a id="property-folddefaults"></a> `foldDefaults` | `readonly` | `Readonly`\&lt;\{ `budgetAccount`: `"root"`; `effort`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `memoizeOutcome`: `boolean`; \}\&gt; | [packages/core/src/journal/keyderiver.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L46) |
| <a id="property-hashversion"></a> `hashVersion` | `readonly` | `number` | [packages/core/src/journal/keyderiver.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L39) |

## Methods

### deriveKey()

```ts
deriveKey(c): string;
```

Defined in: [packages/core/src/journal/keyderiver.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L42)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `c` | [`CanonicalIdentity`](/api/@rulvar/core/type-aliases/CanonicalIdentity.md) |

#### Returns

`string`

***

### project()

```ts
project(input): 
  | "incomparable"
  | CanonicalIdentity;
```

Defined in: [packages/core/src/journal/keyderiver.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L41)

Features not expressible in this profile yield 'incomparable' (a guaranteed non-match).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`IdentityInput`](/api/@rulvar/core/type-aliases/IdentityInput.md) |

#### Returns

  \| `"incomparable"`
  \| [`CanonicalIdentity`](/api/@rulvar/core/type-aliases/CanonicalIdentity.md)

***

### schemaHash()

```ts
schemaHash(schema): string;
```

Defined in: [packages/core/src/journal/keyderiver.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L43)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) |

#### Returns

`string`

***

### toolsetHash()

```ts
toolsetHash(tools): string;
```

Defined in: [packages/core/src/journal/keyderiver.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L44)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tools` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] |

#### Returns

`string`
