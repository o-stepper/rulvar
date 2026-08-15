[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishRepairHint

# Interface: FinishRepairHint

Defined in: `packages/core/dist/index.d.ts`

One structured repair hint on a failed verdict (RV3801): the exact
edit whose application satisfies this validator, precise enough for
the HOST to perform without a provider wire. The third comparison
run died with its repair pool spent on a failure class whose remedy
the evidence-grade verdict already prescribed word for word (write
this run's id inside each offending sentence); a remedy that
deterministic must not cost a model turn. A hint is advisory: the
finish loop attempts the patch only when EVERY failure of the
candidate carries hints, re-runs the FULL validator set over the
patched document, and falls back to the ordinary model repair pool
when the patch does not survive re-validation.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-end"></a> `end` | `readonly` | `number` | Offset one past the offending sentence's last character. | `packages/core/dist/index.d.ts` |
| <a id="property-insert"></a> `insert` | `readonly` | `string` | The identifier whose insertion the verdict prescribes. | `packages/core/dist/index.d.ts` |
| <a id="property-mechanism"></a> `mechanism` | `readonly` | `"insert-run-id"` | The one host-side edit the loop knows how to apply. | `packages/core/dist/index.d.ts` |
| <a id="property-sentence"></a> `sentence` | `readonly` | `string` | The offending sentence verbatim (never normalized or clipped): the loop refuses the patch unless `text.slice(start, end)` equals it, so a stale hint can never edit the wrong bytes. | `packages/core/dist/index.d.ts` |
| <a id="property-start"></a> `start` | `readonly` | `number` | Offset of the offending sentence's first character in the judged text. | `packages/core/dist/index.d.ts` |
