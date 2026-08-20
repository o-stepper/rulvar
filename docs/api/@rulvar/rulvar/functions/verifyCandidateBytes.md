[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / verifyCandidateBytes

# Function: verifyCandidateBytes()

```ts
function verifyCandidateBytes(bytes, hash): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

Verifies retained candidate bytes against a journaled candidateHash
(RV4207). The retained blob holds the candidate's TEXT verbatim (the
document itself for a string result, its JSON serialization
otherwise), while the hash covers the canonical VALUE, so the check
tries the value both ways: as the string document, then as parsed
JSON. Returns false on any mismatch or unparsable bytes, never
throws: the caller is an audit path, and a corrupt blob is a finding
there, not a crash.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `string` \| `Uint8Array`\&lt;`ArrayBufferLike`\&gt; |
| `hash` | `string` |

## Returns

`boolean`
