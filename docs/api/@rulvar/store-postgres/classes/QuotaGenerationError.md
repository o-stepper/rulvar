[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / QuotaGenerationError

# Class: QuotaGenerationError

Defined in: [packages/store-postgres/src/quota.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L146)

Thrown by an admission whose booted rule identity no longer matches
the schema's (RV608): another deployment rotated the recorded rules
fingerprint and generation after this host booted, so admitting under
the retired rules would silently split the budget across mismatched
bucket keys. The refused host must restart with the current rule set;
its outstanding reservations age out with their window (the same
bounded residue a crashed process leaves), and the rotation carried
current-window consumption conservatively. Like every limiter throw,
it lands in the engine's `onLimiterError` policy.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new QuotaGenerationError(
   schema, 
   booted, 
   recorded): QuotaGenerationError;
```

Defined in: [packages/store-postgres/src/quota.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L154)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | `string` |
| `booted` | \{ `fingerprint`: `string`; `generation`: `number`; \} |
| `booted.fingerprint` | `string` |
| `booted.generation` | `number` |
| `recorded` | \{ `fingerprint`: `string` \| `undefined`; `generation`: `number` \| `undefined`; \} |
| `recorded.fingerprint` | `string` \| `undefined` |
| `recorded.generation` | `number` \| `undefined` |

#### Returns

`QuotaGenerationError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-booted"></a> `booted` | `readonly` | \{ `fingerprint`: `string`; `generation`: `number`; \} | What this instance booted with. | [packages/store-postgres/src/quota.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L150) |
| `booted.fingerprint` | `public` | `string` | - | [packages/store-postgres/src/quota.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L150) |
| `booted.generation` | `public` | `number` | - | [packages/store-postgres/src/quota.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L150) |
| <a id="property-recorded"></a> `recorded` | `readonly` | \{ `fingerprint`: `string` \| `undefined`; `generation`: `number` \| `undefined`; \} | What the schema records now (absent fields mean a wiped meta row). | [packages/store-postgres/src/quota.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L152) |
| `recorded.fingerprint` | `public` | `string` \| `undefined` | - | [packages/store-postgres/src/quota.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L152) |
| `recorded.generation` | `public` | `number` \| `undefined` | - | [packages/store-postgres/src/quota.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L152) |
| <a id="property-schema"></a> `schema` | `readonly` | `string` | The schema whose recorded identity moved. | [packages/store-postgres/src/quota.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L148) |
