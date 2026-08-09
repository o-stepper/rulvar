[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / strictExitCode

# Function: strictExitCode()

```ts
function strictExitCode(
   outcome, 
   base, 
   io): number;
```

Defined in: [packages/cli/src/drive.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/drive.ts#L317)

`--strict` (the v1.40.0 improvement plan's completion contract): a
settled ok run whose orchestration acceptance envelope reports a
completion other than 'complete' exits nonzero, with the degraded
reasons printed. Outcomes without an acceptance envelope (a workflow
that never opted into orchestrate acceptance) and nonzero exit codes
pass through unchanged, so the flag never masks the ordinary status
exit and never bites a plain workflow.

Completion is a MECHANICAL verdict, and the eighteenth comparison
benchmark showed how easily `completion: 'complete'` reads as
semantic green while the claim judge saw 40 of 144 citing sentences.
So strict also reads the claim-coverage grade (RV1702) when the
outcome carries a claim-consistency meta: `'judge-failed'` (nothing
was judged), `'judge-declined'` (RV2508: the judge was refused
admission and never dispatched, so nothing was judged either) and
`'critical-uncovered'` (declared claims went unverified) exit
nonzero, because all three previously slipped through strict as
green; `'partial'` prints its counts to stderr and keeps the exit,
because the bounded pass is the documented default and declaring
critical anchors is the opt-in that makes the subset enforceable,
and `'vacuous'` (RV2508: the draft cited nothing, so the configured
pass verified nothing) prints and keeps the exit too, because
citing nothing breaks no contract the pass declares.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outcome` | [`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt; |
| `base` | `number` |
| `io` | [`CliIo`](/api/@rulvar/cli/interfaces/CliIo.md) |

## Returns

`number`
