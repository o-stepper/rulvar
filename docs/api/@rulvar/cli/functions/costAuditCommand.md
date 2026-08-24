[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / costAuditCommand

# Function: costAuditCommand()

```ts
function costAuditCommand(argv, context): Promise<number>;
```

Defined in: [packages/cli/src/commands.ts:1592](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/commands.ts#L1592)

cost-audit (RV1910): the denominator diagnostic over one stored run.
The four-role benchmark's recovery run produced four mutually
inconsistent cost views; the lifecycle now admits one, and this
command VERIFIES it on a concrete journal instead of trusting the
doctrine: the roster is closed (every agent entry terminal), the
settle is recorded and is the billing boundary, and the settled
fold, the invoice totals and the wire cardinality agree. Exit 1
with the failing checks named when any diverge, which is exactly
what a pre-RV1904 journal (the benchmark's own) reports. `--all`
(RV2209) runs the same six checks over EVERY run the store lists,
one summary row each, exit 1 when any run diverges: the parity
sessions audited seven journals one invocation at a time, and a
catalog posture check should cost one command.

The orphaned receipt lane (RV3501): when the invoice carries
`orphanedReceipts` (RV3405, paid wires the settled terminal's record
set does not cover), every output form surfaces it: the single run
text prints the lane totals plus one line per receipt, the JSON
shapes carry the lane verbatim under `invoice`, and the catalog
sweep appends an orphaned suffix to the run's row and a carrying
count to its header. The lane never moves the verdict or the exit
code: an orphaned receipt is the honest double payment window of a
resume, not a divergence, and before this surface a journal in that
shape passed all six checks while the money stayed invisible in
every printed figure. Journals without the lane render byte for
byte as before.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `argv` | `string`[] |
| `context` | [`CommandContext`](/api/@rulvar/cli/interfaces/CommandContext.md) |

## Returns

`Promise`\&lt;`number`\&gt;
