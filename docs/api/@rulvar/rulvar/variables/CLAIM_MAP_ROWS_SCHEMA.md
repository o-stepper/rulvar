[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CLAIM\_MAP\_ROWS\_SCHEMA

# Variable: CLAIM\_MAP\_ROWS\_SCHEMA

```ts
const CLAIM_MAP_ROWS_SCHEMA: SchemaSpec;
```

Defined in: `packages/core/dist/index.d.ts`

The claimMap rows' JSON schema fragment (RV4305): shape and bounds
only. The RELATIONAL rules (anchor bidirectionality, one non-source
row per anchor, per-grade required blocks) are
[validateClaimMapStructure](/api/@rulvar/rulvar/functions/validateClaimMapStructure.md)'s, because a JSON schema cannot
read the document the map describes.
