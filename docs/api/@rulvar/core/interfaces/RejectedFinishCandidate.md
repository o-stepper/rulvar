[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RejectedFinishCandidate

# Interface: RejectedFinishCandidate

Defined in: [packages/core/src/engine/run-handle.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L214)

One finish candidate the declared contract did NOT accept (RV2507).
The 1.226.0 comparison run rejected three syntheses; nothing on its
terminal said so, nothing said whether the three differed from each
other, and the only way to read them was an external script that
re-parsed the whole agent transcript. The row is the artifact that
dig produced, made first class.

`hash` is the sha256 over the canonical candidate: two rows with the
same hash are the model serving the same document twice, which is a
different failure from three genuine attempts and used to be
invisible. `ref` is present exactly under
`finishValidation.retainRejectedCandidates`, and points at a
transcript blob holding the candidate verbatim; without it the row
still identifies and sizes what was rejected, and names the
validators that did it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bytesunavailablereason"></a> `bytesUnavailableReason?` | `"hash-only-persistence"` \| `"store-write-failed"` | Why the bytes are not retained (RV4207), when the run declared a `candidatePersistence`: 'hash-only-persistence' is the policy saying so on purpose, 'store-write-failed' a declared retention the store refused. Absent on undeclared configs, whose rows keep their exact bytes. | [packages/core/src/engine/run-handle.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L234) |
| <a id="property-callid"></a> `callId` | `string` | The finish tool call this candidate arrived on. | [packages/core/src/engine/run-handle.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L216) |
| <a id="property-chars"></a> `chars` | `number` | The candidate's length in characters, honest whether or not the bytes were retained. | [packages/core/src/engine/run-handle.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L222) |
| <a id="property-failed"></a> `failed` | \{ `name`: `string`; `reasons`: `string`[]; \}[] | Each validator that rejected it, with its reasons: the diff. | [packages/core/src/engine/run-handle.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L224) |
| <a id="property-hash"></a> `hash` | `string` | sha256 over the canonical candidate; identity, not location. | [packages/core/src/engine/run-handle.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L220) |
| <a id="property-ref"></a> `ref?` | `string` | Transcript ref holding the bytes; absent unless retention is on and the write succeeded. | [packages/core/src/engine/run-handle.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L226) |
| <a id="property-verdict"></a> `verdict` | `"rejected"` \| `"repair"` | `'repair'` when another turn was granted, `'rejected'` when this was the last. | [packages/core/src/engine/run-handle.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L218) |
