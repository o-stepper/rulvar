[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RejectedFinishCandidate

# Interface: RejectedFinishCandidate

Defined in: [packages/core/src/engine/run-handle.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L201)

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
| <a id="property-callid"></a> `callId` | `string` | The finish tool call this candidate arrived on. | [packages/core/src/engine/run-handle.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L203) |
| <a id="property-chars"></a> `chars` | `number` | The candidate's length in characters, honest whether or not the bytes were retained. | [packages/core/src/engine/run-handle.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L209) |
| <a id="property-failed"></a> `failed` | \{ `name`: `string`; `reasons`: `string`[]; \}[] | Each validator that rejected it, with its reasons: the diff. | [packages/core/src/engine/run-handle.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L211) |
| <a id="property-hash"></a> `hash` | `string` | sha256 over the canonical candidate; identity, not location. | [packages/core/src/engine/run-handle.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L207) |
| <a id="property-ref"></a> `ref?` | `string` | Transcript ref holding the bytes; absent unless retention is on and the write succeeded. | [packages/core/src/engine/run-handle.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L213) |
| <a id="property-verdict"></a> `verdict` | `"rejected"` \| `"repair"` | `'repair'` when another turn was granted, `'rejected'` when this was the last. | [packages/core/src/engine/run-handle.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L205) |
