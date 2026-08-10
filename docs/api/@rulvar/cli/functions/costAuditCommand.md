[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / costAuditCommand

# Function: costAuditCommand()

```ts
function costAuditCommand(argv, context): Promise<number>;
```

Defined in: [packages/cli/src/commands.ts:1168](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/commands.ts#L1168)

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

## Parameters

| Parameter | Type |
| ------ | ------ |
| `argv` | `string`[] |
| `context` | [`CommandContext`](/api/@rulvar/cli/interfaces/CommandContext.md) |

## Returns

`Promise`\&lt;`number`\&gt;
