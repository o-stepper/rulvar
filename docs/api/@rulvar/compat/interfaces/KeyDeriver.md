[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/compat](/api/@rulvar/compat/index.md) / KeyDeriver

# Interface: KeyDeriver

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dispositiontable"></a> `dispositionTable` | `readonly` | [`DispositionTable`](/api/@rulvar/rulvar/type-aliases/DispositionTable.md) | `packages/core/dist/index.d.ts` |
| <a id="property-folddefaults"></a> `foldDefaults` | `readonly` | `Readonly`\&lt;\{ `budgetAccount`: `"root"`; `effort`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `memoizeOutcome`: `boolean`; \}\&gt; | `packages/core/dist/index.d.ts` |
| <a id="property-hashversion"></a> `hashVersion` | `readonly` | `number` | `packages/core/dist/index.d.ts` |

## Methods

### deriveKey()

```ts
deriveKey(c): string;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `c` | [`CanonicalIdentity`](/api/@rulvar/rulvar/type-aliases/CanonicalIdentity.md) |

#### Returns

`string`

***

### project()

```ts
project(input): 
  | CanonicalIdentity
  | "incomparable";
```

Defined in: `packages/core/dist/index.d.ts`

Features not expressible in this profile yield 'incomparable' (a guaranteed non-match).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`IdentityInput`](/api/@rulvar/rulvar/type-aliases/IdentityInput.md) |

#### Returns

  \| [`CanonicalIdentity`](/api/@rulvar/rulvar/type-aliases/CanonicalIdentity.md)
  \| `"incomparable"`

***

### schemaHash()

```ts
schemaHash(schema): string;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) |

#### Returns

`string`

***

### toolsetHash()

```ts
toolsetHash(tools): string;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tools` | [`ToolContract`](/api/@rulvar/rulvar/interfaces/ToolContract.md)[] |

#### Returns

`string`
