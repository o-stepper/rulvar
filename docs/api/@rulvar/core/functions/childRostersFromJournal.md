[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / childRostersFromJournal

# Function: childRostersFromJournal()

```ts
function childRostersFromJournal(entries): JournaledChildRoster[];
```

Defined in: [packages/core/src/stores/reconcile.ts:482](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L482)

Every orchestration's children, folded from a run's journal (RV2702).

`childrenAtFailure` (RV2602) answers this for a LIVE consumer, and it
dies with the process that held it: the settle persists the
completion lift and nothing else, so a post-mortem over a journal,
which is all a paid run leaves behind, had no way to ask what the
children produced. Every ingredient was already written down. This
is the fold.

It reads what resume reads. A `spawn-admission` decision names every
child the controller judged, with its ordinal, its profile, its
verdict, and the scope its dispatch pins to; the dispatch and
terminal `agent` entries under that scope are the child itself, and
the RV806 evidence verdict rides the terminal. Nothing is
re-derived and no validator runs again, so a journal written by any
prior version reads exactly as well as today's, which is the point:
the runs worth a post-mortem are the ones already in the archive.

Two things it deliberately does NOT claim. It is not the live
roster: this reading happens after the RV1903 exit barrier settled
the stragglers, so a child the live field would have called
unsettled usually has a terminal here, and `status` is absent only
where the journal truly ends mid-flight. And it names children by
their dispatch seq rather than by nodeId, because the seq is the
handle the orchestrator's own turns used and the one a reader can
follow into the transcript.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

[`JournaledChildRoster`](/api/@rulvar/core/interfaces/JournaledChildRoster.md)[]
