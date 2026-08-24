---
title: The effect lane
description: "Performing an external effect under a revocable approval with durable evidence: the journaled consumption protocol, the provider capability matrix, crash-window recovery licensed by provider-side fencing, receipts, budgets, quarantine, and the kill point conformance kit."
---

# The effect lane

A run can produce an accepted deliverable, and a host can gate on the production predicate; the effect lane is the protocol for the step that matters most: performing an external effect (moving money, sending a signed notice, opening a review case) with durable evidence, under a revocable approval. The design is [`rfcs/effects.md`](https://github.com/o-stepper/rulvar/blob/main/rfcs/effects.md); this page is the shipped runtime: the fold and the writer in `@rulvar/core`, the adapter seam, dispatcher, reconciler, receipts, and the conformance kit in [`@rulvar/effects`](/api/@rulvar/effects/).

The one-paragraph architecture: an effect is a journal protocol, not a tool call. Consuming an approval and recording an intent is ONE append (`consumeApprovalAndRecordIntent`) whose verdict is a pure function of the journal prefix before it; re-dispatch after an ambiguous send is licensed only by provider-side fencing (idempotency keys, conditional create, acceptance-closing negatives), never by elapsed time; terminals are immutable and late facts become linked incidents; and providers without any fencing quarantine their ambiguous windows for a human instead of guessing.

## What may enter the lane

`effectLaneAdmissible(envelope)` evaluates five conjuncts over the run's terminal envelope, fail closed: `settled`, `status === 'ok'`, `completion === 'complete'`, `deliverableAccepted`, and `productionAcceptable(semanticTerminalVerdict)`. Each refusal names the first conjunct that failed. An effectful operation MUST NOT ride the plain isolated tool path (`ToolExecutorProvider` plus the executor ledger): that path rechecks the approval and dispatches with no intent fold, no epoch, and no receipt machinery; the effect adapter seam is the only dispatch path the conformance kit blesses for effect classes.

## The consumption protocol

Effect lane facts ride kind-`decision` journal entries with typed payloads (`effect_epoch`, `effect_intent`, `effect_attempt`, `effect_outcome`, `effect_receipt`, `effect_terminal`, `effect_incident`, `effect_disposition`, `effect_probe`, `effect_reconciliation_complete`), read by one authority: `EffectLaneFold`. An intent consumed its approval exactly when, over the strict prefix of its position, the approval resolved allow, no revocation and no `approval_expired` decision precedes it, the cited epoch is the latest, the approval's own recorded `effectLogicalKey` equals the intent's key, and no earlier non-void intent claimed the key in this epoch, whatever approval it cites. Every lane append carries a caller-minted stable operation id; an uncertain append result reloads and searches for its own id before any retry, so a committed append with a lost ack is the same transition, never a duplicate.

An effect approval must carry a deadline (refused at intake without one), and a crossed grant expiry becomes effective only as an appended `approval_expired` decision: the fold never reads a wall clock.

## The capability matrix and recovery

The host declares one row per provider, recorded on the intent: `idempotency-key` (the send carries the key, the provider dedupes; the recommended row for money), `lookup` earned by a recorded qualification (an acceptance-closing primitive whose negative is provider-enforced final, or conditional create under a unique natural key), or `neither`. Crash-window recovery derives from the row: the idempotency row re-dispatches under the same key; the closing row closes the ambiguous ATTEMPT identity so the fresh attempt stays legal while the stale one is refused at the provider; conditional create leans on the unique key; `neither` quarantines every ambiguous window, and the quarantine record names that a stale send may still land later. From a revocation or expiry position on, recovery is reconcile-only on EVERY row: a found receipt confirms (a revocation then opens the compensation decision path as a linked incident; expiry opens none, because it bounds the grant, not the past), an acceptance-closing negative cancels with the proof on the record, and anything unresolvable quarantines.

## Receipts, budgets, and the sweep

A receipt confirms only after verification against a declared trust envelope (issuers, per-class content bindings, key validity windows, revocation from its time forward, the host's signature check); every failure classifies unverified and routes to `unknown`. Every intent records its budgets (`attempts`, `lookups`, `receiptWaitMs`, `reconcileBy`), provider probes are journaled rows so the lookup bound survives crashes, and the reconciler's sweep quarantines every exhaustion with the state recorded. Effect authorizations past their deadline refuse durably. `rulvar effects ls | show | sweep` print the fold report and run the quarantine-only sweep from the CLI.

## Restores

The lane requires a leasable store with `fencedWrites` in production; sqlite and postgres additionally carry a restoration generation OUTSIDE the journal bytes (`EffectLaneStore`). The restore runbook is one rule: after a point-in-time restore, call `bumpRestorationGeneration()` BEFORE the restored database becomes reachable to any worker. The restored store then refuses every lane append until an operator appends a fresh `effect_epoch` citing the bumped generation, and attempt dispatch stays disabled until the reconciliation sweep appends `effect_reconciliation_complete`: provider effects the journal cannot reconstruct quarantine by name, and without authoritative enumeration the whole range quarantines.

## The conformance kit

`effectsConformance({ store })` runs every `effects.kill.*` row of the RFC's catalog (thirty checks: crash windows, ambiguous acks at every transition, approval windows, receipt duplicates, budgets, the stalled predecessor, the post-restore window) against YOUR store, with ambiguous acks and restoration generations injected through delegating proxies. The in-memory reference store runs it under explicitly single-process semantics; the sqlite and postgres packages run it over the real leases and fences. A host's promotion evidence is this kit green against its own store, the capability matrix filled per provider with every `lookup` qualification recorded and every `neither` row acknowledged, and a quarantine and incident runbook naming principals.
