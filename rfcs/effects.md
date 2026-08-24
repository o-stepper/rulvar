# RFC: effect intents, receipts, and reconciliation

Status: IMPLEMENTED (plan 45, trains RV4501 to RV4506): the consumption fold and the
writer in @rulvar/core, the adapter seam, dispatcher, reconciler, receipts, telemetry,
and the kill point conformance kit in @rulvar/effects, with two recorded deviations
(effect lane facts ride kind-'decision' entries because the kinds registry is versioned
inside the hashVersion 2 identity profile; the store-side unleased-append rejection is
enforced by the writer's construction plus the conformance kit over the composition,
because stores never parse payloads) and one derived overlay (the original's
'compensated' disposition derives from a confirmed compensation citing a confirmed
original, because terminals are immutable). Originally: accepted design (RV4301, plan
43), hardened by two adversarial review passes of the kill point catalog and the
protocol (13 findings, then 5 on the revision; every one incorporated). A seam described here may be called frozen only because
section 4 resolves the central atomicity question; everything else is design intent that
the effects plan may still adjust with a recorded reason.

Scope: P0.4 of the sixth comparison experiment's improvement plan (reference effect
intent and outcome contract plus a conformance kit). Related but out of scope here:
P0.5 (consumer gates) shipped as RV4209; candidate lineage shipped as RV4207.

## 1. Problem and evidence

A Rulvar run today can produce an accepted deliverable, and a host can gate on the
production predicate, but nothing in Rulvar gives the host a protocol for the step that
matters most: performing an external effect (moving money, sending a signed notice,
opening a review case) exactly once, with durable evidence, under a revocable approval.

What exists is deliberately weaker:

1. The executor effect ledger (`ToolEffectIntent`, `ToolEffectRecord`, `ToolEffectLedger`
   in `@rulvar/executor`, RV404/RV501) records intent before dispatch and outcome after
   it, which turns a crash window into an orphan intent instead of an untracked effect.
   It is an observation seam, honestly not an outbox: nothing consumes an approval, no
   receipt is verified, recovery policy is left entirely to the host, and the ledger is
   optional and lives outside the journal.
2. Tool approvals (`awaitApproval`, `ApprovalDecision`, RV4008) are journaled
   suspensions with expiry and revocation, and the consumption recheck in the engine
   consults the journal one more time at the moment an allow is about to license a
   dispatch. The recheck is a read followed by a dispatch: between the read and the
   network send, a revocation can land and the effect still fires. For a chat tool this
   window is acceptable; for a payout it is the whole problem.
3. The semantic half of the admission predicate exists (`semanticTerminalVerdictOf`,
   `productionAcceptable`, RV4209), but nothing binds "this run may enter the effect
   lane" to "this concrete effect was licensed by this concrete approval".

## 2. Verified surfaces this design builds on, stated precisely

1. The journal is an append only record with a pure fold. The `seq` of an entry is
   minted by the CALLER (the replayer assigns it locally before calling
   `JournalStore.append`, which returns void); the store's obligation is uniqueness per
   `(runId, seq)`, so of two concurrent appends at the same position exactly one lands
   and the other errors. Section 4 builds its compare and swap on exactly that
   uniqueness, not on a store assigned sequence, because no such assignment exists in
   the SPI.
2. Resolutions settle by `first-closing-wins` arbitration, and offline authorities
   validate resolutions with the same code path as the live engine
   (`validateDetachedResolution`). Deadline timers already materialize a clock fact as
   an appended resolution (the RV1107 deny by timeout), the precedent section 4.5 leans
   on.
3. Approvals carry `entryRef`, optional `expiresAt`, and revocation appends an
   `approval_revoked` decision entry (`ExternalRegistry.revokeApproval`,
   `ApprovalRevocationOutcome`).
4. Fenced writes, as actually specified: a store with `fencedWrites` rejects a mutation
   carrying a SUPERSEDED lease. An unleased append is not rejected merely because a
   lease exists elsewhere, and the in memory reference store is not leasable at all.
   The effect lane therefore cannot inherit safety from `fencedWrites` as is; section
   4.4 states the stronger store capability it requires instead.
5. Isolated tool dispatch derives a stable idempotency key from the logical invocation
   plus the run's generation token (`deriveExecIdempotencyKeyV2`, RV403). The
   generation token lives in `RunMeta.genesis`, which is meta, not journal; section
   4.5 journals an epoch fact precisely because a journal only fold cannot read meta.
6. The terminal envelope carries `settled`, `status`, `completion`,
   `deliverableAccepted`, `semanticTerminalVerdict`, `configFingerprint`; accepted
   artifact bytes are addressable by hash (`candidateHashOf`, RV4207).

## 3. State machines

### 3.1 The common core

Every effect class shares one skeleton; the classes differ in compensation semantics and
in what a receipt proves. States are journal facts (each transition is exactly one
journal append), never in memory flags:

1. `declared`: the effect is described (effect logical key, provider row, arguments
   hash, amount or document hash) but not yet authorized. No provider interaction is
   legal. The wait for authorization is bounded: an approval that licenses an effect
   MUST carry an approval deadline (`deadlineAt`, the RV1107 machinery); an effect
   approval without one is refused at intake, so `declared` cannot wait forever.
2. `intent`: the single linearization append (section 4) consumed a standing approval
   and durably recorded the intent, including its recovery budgets (attempts, lookups,
   receipt wait, and an overall `reconcileBy` deadline). From here the effect must
   reach a terminal state; every budget exhaustion path lands in `quarantined`, so the
   machine cannot loiter in a non terminal state past `reconcileBy`.
3. `dispatching`: an attempt record is appended BEFORE the network send (attempt
   ordinal, transport, idempotency key when the row has one, and the attempt's
   `notAfter` send deadline). At most one attempt may be open at a time; attempts are
   sub records of the ONE intent, never new intents.
4. `awaiting-receipt`: the provider accepted the request and a receipt is expected
   asynchronously (webhook, poll, statement). Bounded by the intent's receipt wait
   budget; exhaustion appends `quarantined`.
5. `confirmed`: a verified receipt is journaled. Terminal and immutable: no later
   append reopens it (section 4.6); later conflicting facts become linked incident
   records requiring disposition.
6. `unknown`: the outcome of an attempt cannot be classified from what the journal
   holds. Not terminal: the only legal exits are qualified provider lookup (section 6),
   bounded by the lookup budget, or `quarantined`.
7. `quarantined`: the protocol refuses to decide automatically; a human resolution is
   required and is itself journaled (principal, reason, disposition). Terminal for the
   machine; a disposition may open a new effect (for example a compensation) under its
   own key.
8. `compensating` and `compensated`: a recorded reversal intent and its confirmation. A
   compensation is itself an effect intent under a distinct key carrying a
   `compensates` causal reference, with the same machinery, bounded to depth one: a
   failed compensation quarantines, it is never auto compensated. The wait for
   compensation authorization is bounded like any `declared` wait (item 1); timeout
   quarantines.
9. `cancelled-before-dispatch`: a revocation or cancellation landed after the intent
   but before the first attempt append. The journal proves no conforming send ever
   happened (zero attempt records), so this is a clean no effect terminal, distinct
   from compensation.
10. `refused`: the intent append landed but folded void (section 4.3), or the admission
    predicate failed. Terminal; no provider interaction happened.

### 3.2 Monetary effects (payout, refund, credit)

1. The receipt proves value movement: provider transfer id, amount, currency,
   timestamp.
2. Duplicate receipts are the dominant hazard: the classifier (section 9) must separate
   benign idempotent duplicates (same transfer id, same amount) from conflicting ones
   (same effect logical key, different transfer id or amount). A conflict arriving
   before any terminal quarantines the intent; one arriving after `confirmed` becomes a
   linked incident (section 4.6), because a terminal never reopens.
3. Compensation is a first class reversal (refund or ledger credit note) requiring its
   own authorization when it exceeds the host's configured threshold.
4. Most payment providers offer idempotency keys; the matrix row `idempotency-key`
   (section 6) is the expected common case and the only row immune to the stale sender
   hazard (section 4.4), which makes it the recommended row for money.

### 3.3 Signing effects (signed notice, attestation, contract)

1. The receipt is a signed acknowledgment; verification runs the trust envelope of
   section 7 (issuer, key validity window, revocation), and an unverifiable receipt is
   `unknown`, never `confirmed`.
2. A delivered notice cannot be undelivered: compensation is always a successor effect
   (a correction or revocation notice) under its own key with a `successorOf` causal
   reference, never a deletion of the original.
3. Providers here frequently qualify for the `lookup` row through a natural document
   id with conditional create semantics (section 6).

### 3.4 Case effects (open, annotate, close a review case)

1. Effects are naturally idempotent by case natural key; conditional create by that key
   qualifies the provider for `lookup`.
2. Compensation is closing or reassigning the case; the hazard is not duplication but
   orphaning (a case opened by a run whose journal was restored to an earlier point),
   which the restoration epoch protocol (section 4.5 and section 8, item 16) exists to
   catch.

## 4. The atomicity decision: consuming an approval and recording an intent

### 4.1 The problem, stated honestly

P0.4 asks for an atomic `consumeApprovalAndRecordIntent`. Approvals live in an append
only journal; there is no update in place to make "the allow is now consumed" and "the
intent now exists" one write. Today's consumption recheck reads the snapshot and then
dispatches, so revocation and dispatch race. Two protocols can close this, and the
document must choose one; without the choice no seam here may be called frozen.

### 4.2 The two candidate protocols

1. An authoritative transactional host database: approval state and intents live in one
   ACID store owned by the host; the journal becomes a secondary record of what the
   database decided.
2. A journaled consumption protocol: the intent is itself a journal append, and whether
   it consumed the approval is a pure function of the journal prefix before it, with
   the append's position contended through the store's `(runId, seq)` uniqueness.

### 4.3 Decision: the journaled consumption protocol

The intent append is the atomic operation. `consumeApprovalAndRecordIntent` exists, and
it is one append, not one transaction:

1. The append: the engine folds the journal, computes the tail position, and appends an
   `effect_intent` entry at `tail + 1` carrying: a caller minted stable operation id
   (its content key, the existing dedup identity machinery), the approval `entryRef` it
   consumes, the effect logical key, the provider row from the capability matrix, the
   arguments hash, the accepted artifact hash and `configFingerprint`, the epoch
   reference (section 4.5), and the recovery budgets of section 3.1.
2. The contention rule: the store accepts exactly one entry per `(runId, seq)`. A loser
   reloads, re-folds, and either finds its own operation id already landed (the
   ambiguous commit case: an append can commit and then the ack can be lost; the reload
   MUST look for the operation id before retrying, and the fold treats a same
   operation replay as the same intent, never as a duplicate), or retries at the new
   tail while its verdict still holds, or gives up with a durable `refused` reason.
   This rule is UNIVERSAL, not an intent special case: EVERY effect lane append
   (intent, attempt, outcome, receipt, terminal, incident, disposition) carries a
   caller minted stable operation id, and every uncertain append result reloads and
   searches for that id before any retry. Without this, a lost ack on an attempt
   append fabricates a second open attempt, on an outcome append exhausts budgets
   early, and on a terminal append quarantines an effect the journal already closed.
3. The consumption fold, over the strict prefix of the intent's position: the
   referenced approval resolved `allow`; no `approval_revoked` and no
   `approval_expired` decision targeting that `entryRef` precedes the intent (clock
   facts enter the fold only as appended decisions, section 4.5); the epoch reference
   matches the journaled current epoch; and no earlier non void `effect_intent` with
   the SAME effect logical key exists in this epoch, regardless of which approval it
   cites. One canonical intent per logical key: two approvals can never license two
   sends of one effect, and retries are attempts under the one intent, never new
   intents. Compensations and successors use distinct keys with `compensates` or
   `successorOf` causal references.
4. An approval licenses exactly one effect logical key, recorded on the approval
   request itself, so the fold can also refuse an intent whose key differs from the
   key the approval named.
5. The linearization point is the accepted append's position. A revocation at a lower
   position deterministically voids the intent; a revocation at a higher position is
   deterministically too late to void it, and its consequence depends on where the
   machine is, per the state table of section 4.7: the dispatcher MUST re-fold
   immediately before opening each attempt, so a revocation with zero attempts open
   always cancels cleanly, and every later window has a named reconcile only rule.

### 4.4 Fencing, leases, and the stale sender

What fencing can and cannot do, stated without optimism:

1. Journal writes are fenceable. The effect lane REQUIRES a store capability stronger
   than today's `fencedWrites`: every effect lane append (intent, attempt, outcome,
   receipt, disposition) MUST carry the current lease, and a qualifying store MUST
   reject an effect lane append that carries a superseded lease OR no lease at all.
   The in memory store is not leasable and is therefore excluded from production
   effects; conformance runs it only for explicitly single process semantics.
2. A network send is NOT fenceable by any store, and no local clock check closes the
   hole: a process can pass its `notAfter` check, be suspended by the scheduler for an
   unbounded time, wake, and transmit, so a temporal guard bounds clock disagreement
   and nothing else. Re-dispatch after an open attempt is therefore licensed ONLY by
   provider side fencing, never by elapsed time: the provider's idempotency key dedup
   (the stale sender and the successor derive the SAME key from the same attempt
   record, so at most one effect commits; this is why section 3.2 recommends the row
   for money), the provider's conditional create uniqueness (a late duplicate fails
   or dedupes at the provider), or a provider primitive that CLOSES acceptance of the
   specific attempt (a query then cancel that makes late bytes unacceptable) executed
   before the successor's re-dispatch. A `lookup` provider without one of those and
   every pure `neither` provider gets no automatic re-dispatch after an open attempt
   at all: the successor reconciles to a receipt or a qualified negative, and an
   unresolvable open attempt quarantines PERMANENTLY, with the quarantine record
   stating that a stale send may still land later, so the human disposition happens
   with that fact on the table instead of behind it. `notAfter` stays as defense in
   depth (an honest dispatcher refusing late sends shrinks the window), and every
   attempt's `notAfter` plus the declared skew `delta` must not exceed the intent's
   `reconcileBy`, but nothing in the protocol treats the guard as proof.

### 4.5 Clock facts and epoch facts enter the journal, or they do not exist

The fold reads only journal bytes, so two classes of environmental fact are journaled
explicitly instead of being evaluated inline:

1. Expiry: the fold never compares wall clocks. An approval's `expiresAt` becomes
   effective in the fold only through an appended `approval_expired` decision, which
   any observer (the recovery sweep, the engine's recheck, an operator) may append; the
   decision only materializes a crossing that the approval's own recorded `expiresAt`
   already determines, so appending it needs no authority beyond append rights. The
   live dispatcher additionally refuses on its local clock as a fail closed guard, but
   that guard is advisory; the deterministic truth is the appended decision.
2. Epoch: before the first effect intent of a run incarnation, the engine appends an
   `effect_epoch` entry recording the run's generation token and the current
   restoration epoch (below). Every intent cites the epoch entry; an intent citing a
   stale epoch folds void. This puts the generation token INTO the journal for the
   effect lane, closing the gap that `RunMeta.genesis` is meta and invisible to a
   journal only fold.
3. Restoration epoch: a point in time restore is an operator act, and a journaled
   barrier alone would not exist until someone appends it, which leaves a gap where a
   worker dispatches against the freshly restored snapshot whose OLD epoch and old
   `reconciliation_complete` read as current. The gate is therefore a STORE level
   fact, part of the effect lane store capability: the store carries a restoration
   generation OUTSIDE the journal bytes, every effect lease acquisition and every
   effect lane append validates it, and the restore procedure bumps it atomically
   BEFORE the restored data becomes reachable, so the restored store comes up with
   effect dispatch disabled by construction. The operator then appends the new
   `effect_epoch` (recording the bumped generation), reconciliation runs, and the
   `reconciliation_complete` decision for THAT epoch re-enables dispatch. The
   journaled epoch remains the fold visible record; the store level generation is
   what makes the window between reachability and the first append non dispatchable.
   Idempotency keys and logical keys embed the epoch, so identities erased by the
   restore are never silently reused.

### 4.6 Arbitration: terminals are immutable, conflicts become incidents

The `first-closing-wins` doctrine extends to the effect machine:

1. The first terminal append for an intent (`confirmed`, `quarantined`,
   `cancelled-before-dispatch`, `compensated`, `refused`) closes it; any later append
   that would transition the closed machine folds as a durable no op with a recorded
   `superseded-by` reason, exactly like a losing resolution attempt.
2. Facts that arrive after a terminal and genuinely matter (a verified receipt after
   quarantine, a conflicting duplicate after confirmation, a revocation after
   confirmation) fold as LINKED INCIDENT records: durable, carrying the causal
   reference, surfaced in telemetry and requiring disposition, but never mutating the
   terminal. A receipt that arrives after quarantine is disposition input for the
   human, not a resurrection.
3. Ordering between two racing CLOSING facts is decided by position, and the terminal
   IS order dependent, stated plainly: a budget exhaustion quarantine racing a
   verified receipt lands in `quarantined` plus a receipt incident when the
   quarantine appends first, and in `confirmed` when the receipt does. Both histories
   are legal, each is deterministic given its journal, and the protocol does NOT
   claim order independence; what it guarantees is that either way the conflicting
   fact is durable, linked, and demands disposition, so no ordering loses
   information. A dispatcher that has a verified receipt in hand appends it before
   any policy terminal, which makes the racy window an implementation's last resort
   rather than its habit.

### 4.7 Revocation and expiry, state by state

A revocation (or an `approval_expired` decision) whose position is AFTER the intent's
has a defined consequence in every machine state; "before the first attempt" and
"after confirmation" are two rows of a total table, not the whole of it:

1. Zero attempt records: append `cancelled-before-dispatch`. No effect existed, none
   will.
2. An open attempt (appended, outcome unknown): all re-dispatch is disabled from this
   position on, EVERY row including `idempotency-key` (a re-dispatch would knowingly
   execute a revoked effect; the dedup key makes it safe against duplication, not
   against revocation). The recovery is reconcile only: a verified receipt or a
   qualified positive proves the pre revocation send executed, and the machine goes
   `confirmed` with the compensation decision path opened by the revocation incident
   (for expiry: `confirmed` with NO compensation, because the send predated the
   crossing and expiry bounds the grant, not the past); a qualified negative that
   closes acceptance proves no effect, and the machine appends the cancel terminal;
   anything unresolvable quarantines with the revocation on the record.
3. `awaiting-receipt`: the same rule as row 2, minus the possibility of a negative:
   the provider accepted, so the outcome is `confirmed` plus the compensation path
   (revocation) or plain `confirmed` (expiry), or quarantine on receipt wait
   exhaustion as always.
4. After any terminal: the revocation folds as a linked incident on the terminal
   (section 4.6); a `confirmed` terminal's incident opens the compensation decision.

## 5. The effect lane admission predicate

An effect intent for a run deliverable may be recorded only when every conjunct below
holds on the run's terminal envelope. One clean looking verdict is deliberately not
enough; each conjunct has a concrete counterexample it exists to refuse:

1. `settled === true`: an unsettled or superseded segment must never license effects.
2. `status === 'ok'`: an `exhausted` or `cancelled` terminal can still carry artifacts;
   they are diagnostics, not deliverables.
3. `completion === 'complete'`: a `partial` salvage is readable by humans and
   unacceptable to an effect lane.
4. `deliverableAccepted === true`: without a finish contract there is no accepted
   deliverable to act on.
5. `productionAcceptable(semanticTerminalVerdict).ok === true`: `waived`, `partial`,
   `vacuous`, and `not-judged` all refuse, by the RV4209 rule, fail closed on absence.

The intent entry records the envelope's `configFingerprint` and the accepted artifact's
hash, so the receipt chain binds the money or the signature to the exact accepted bytes
(RV4207 makes the hash verifiable), not to "whatever the run said at some point".

One more refusal belongs here because the bypass exists in the shipped code: an
effectful operation MUST NOT ride the plain isolated tool path (`ToolExecutorProvider`
plus the optional executor ledger). That path rechecks the approval and then dispatches
with no intent fold, no epoch, no receipt machinery; it is the correct seam for
sandboxed computation and the wrong seam for money. The production host dossier's
promotion checklist carries this as a named prohibition, and the effect adapter seam
(section 11) is the only dispatch path the conformance kit blesses for effect classes.

## 6. Provider capability matrix

The host declares one row per provider; the row is recorded in the intent and drives
recovery policy. The row names are contract vocabulary, not documentation prose:

| capability        | dispatch contract                                                   | on `unknown`                                                        | automatic retry                              |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| `idempotency-key` | the send carries the key; the provider dedupes                      | bounded re-dispatch under the same key, or lookup by key if offered | allowed, same key, bounded attempts          |
| `lookup`          | no dedup on send; attempt status queryable with the guarantee below | qualified query first, never a blind send                           | only after a negative that CLOSED acceptance |
| `neither`         | fire once, blind                                                    | quarantine immediately                                              | forbidden; manual disposition only           |

Qualification for the `lookup` row is strict, because a negative answer from an
eventually consistent search proves nothing: a provider earns the row only when one of
the following holds, and the host records WHICH one on the row:

1. Acceptance closing status: the provider can answer, for a specific attempt
   identity, "not accepted and can no longer BE accepted", where the second half is a
   provider enforced closure (a query then cancel primitive that makes late bytes
   unacceptable, or the provider's own request deadline semantics), not a consistency
   promise about the read. Section 4.4 is the reason: a stale sender can transmit
   after any amount of waiting, so only a provider that refuses the late request
   makes a negative answer final.
2. Conditional create: the effect is created under a provider enforced unique natural
   key, so a duplicate send fails or dedupes at the provider; a negative existence
   check does not need to be provably final because the send itself is.

A provider that offers only eventually consistent search, or a strongly consistent
read WITHOUT acceptance closure, MUST be classified `neither`, whatever its marketing
says about lookup.

## 7. Receipts and the trust envelope

A receipt confirms an effect only after verification against a declared trust envelope:

1. Issuer identity: which principal or provider key may sign receipts for this provider
   row.
2. Content: the receipt must bind the effect logical key, the provider reference, the
   amount or document hash, and a timestamp; a receipt that binds fewer fields verifies
   as `unverified`.
3. Keys: signature scheme and key id resolve against a key set with validity windows;
   rotation means old receipts still verify inside their window.
4. Revocation: a revoked signing key fails verification from its revocation time
   forward; the classification is `unverified`, which routes to `unknown`, never to
   `confirmed` and never to silent discard.

## 8. Kill point catalog

Each name below is a future conformance test in the kit (section 11); the list is the
acceptance surface for "no blind retry at any crash point". Money class runs the whole
list; signing and case classes run it minus the rows that do not apply, and that
exclusion list is itself part of the kit. The catalog distinguishes windows by what the
journal PROVES afterwards, and a conforming dispatcher always appends the attempt
record before sending, which is what makes the distinctions real.

1. `effects.kill.before-intent-append`: crash before the intent append. No journal
   trace, no consumption; re running the lane is safe and starts from `declared`.
2. `effects.kill.intent-append-ambiguous-ack`: the append committed but the ack was
   lost. Recovery reloads and finds its own operation id: the intent exists exactly
   once, no duplicate and no refused ghost (section 4.3, item 2).
3. `effects.kill.after-intent-before-attempt-append`: consumed intent, zero attempt
   records. The journal PROVES no conforming send happened, so recovery may cancel
   (on a revocation in the prefix: `cancelled-before-dispatch`) or open attempt one,
   for every capability row including `neither`; quarantining here would be false
   modesty and the test pins that it does not happen.
4. `effects.kill.after-attempt-append-before-send`: an open attempt exists; the send
   may or may not have left. Ambiguous by construction. Recovery: `idempotency-key`
   re-dispatches the same key (provider dedup is the fence); `lookup` re-dispatches
   only after a negative that CLOSED acceptance (section 6); `neither` quarantines,
   and the quarantine record names the possible late stale send (section 4.4).
5. `effects.kill.during-send`: indistinguishable from item 4 in the journal, and the
   test asserts the recovery path is byte identical to item 4.
6. `effects.kill.after-send-before-outcome-append`: the provider effect may exist.
   Same recovery as item 4; a found effect appends the outcome retroactively and
   proceeds to receipt handling.
7. `effects.kill.after-terminal-append`: terminal state already durable; resume is a
   no op and must not contact the provider again.
8. `effects.provider.accepted-but-timeout`: transport timeout after provider accept.
   Outcome `unknown`, then the capability row decides, exactly as item 4.
9. `effects.receipt.duplicate-benign`: a second receipt, same transfer id and amount.
   Confirms once, counts once.
10. `effects.receipt.duplicate-conflicting`: same logical key, different transfer id or
    amount. Before a terminal: quarantine. After `confirmed`: the terminal stands and a
    linked incident record demands disposition (section 4.6).
11. `effects.receipt.after-quarantine`: a verified receipt lands after the quarantine
    terminal. The terminal stands; the receipt folds as a linked incident and becomes
    disposition input, never a resurrection.
12. `effects.approval.stale-at-intent`: an `approval_expired` decision precedes the
    intent; the intent folds void, state `refused`. The companion test pins that the
    fold itself never reads a wall clock.
13. `effects.approval.revoked-before-intent`: a revocation at a lower position voids
    the intent deterministically.
14. `effects.approval.revoked-between-intent-and-first-attempt`: the pre attempt
    re-fold sees the revocation and appends `cancelled-before-dispatch`; no send
    happens, and no compensation is opened, because there is nothing to compensate.
15. `effects.approval.revoked-after-confirmation`: consumption and confirmation stand;
    the revocation opens the compensation decision path and the causal chain records
    both.
16. `effects.lease.lost-before-intent-append`: the store refuses the unleased or
    superseded append (the section 4.4 capability); nothing was consumed.
17. `effects.lease.lost-between-intent-and-dispatch`: the successor owns recovery,
    and the test runs a DELIBERATELY stalled predecessor that sends long after losing
    its lease: for `idempotency-key` the provider fake dedupes the late send against
    the successor's; for conditional create it refuses the duplicate; for acceptance
    closing lookup the successor's cancel makes the late bytes unacceptable; for
    `neither` the intent is already quarantined and the late send lands as a provider
    effect the next reconciliation sweep reports against the quarantine record.
    Elapsed time licenses nothing anywhere in the test.
18. `effects.budget.attempts-exhausted`: the attempt budget runs out; the machine
    appends `quarantined`, never an unbounded retry loop.
19. `effects.budget.lookup-exhausted`: lookup attempts are bounded separately from
    dispatch attempts; exhaustion quarantines.
20. `effects.budget.receipt-wait-exhausted`: `awaiting-receipt` past the receipt wait
    budget quarantines.
21. `effects.budget.reconcile-by-crossed`: whatever non terminal state the machine is
    in, crossing the intent's `reconcileBy` quarantines it with the state it was in
    recorded.
22. `effects.compensation.authorization-timeout`: a compensation waiting for its
    approval past the approval deadline quarantines instead of waiting forever.
23. `effects.compensation.crash-during-compensation`: the compensation intent replays
    with the same machinery; a compensation that cannot be confirmed quarantines and
    is never auto compensated at depth two.
24. `effects.epoch.stale-generation`: an intent citing a stale `effect_epoch` folds
    void; a recreated run never spends the dead incarnation's approvals.
25. `effects.reconcile.after-pitr`: the journal restored to an earlier point. The
    restored store comes up with its restoration generation bumped and effect
    dispatch disabled at the STORE level (section 4.5, item 3), so the window between
    reachability and the operator's epoch append dispatches nothing; the test drives
    a worker against exactly that window. After the epoch append, enumeration capable
    providers reconcile by sweep (a provider effect without a journaled intent
    quarantines with a record that names what could NOT be reconstructed; a consumed
    intent without a provider effect re-enters recovery per its row); providers
    without authoritative enumeration quarantine the whole affected range, and
    automatic recovery there is forbidden.
26. `effects.duplicate.second-approval-same-key`: a second intent for the same effect
    logical key under a DIFFERENT approval folds void; one canonical intent per key
    per epoch.
27. `effects.approval.revoked-during-open-attempt`: a revocation lands while an
    attempt is open. Re-dispatch is disabled on EVERY capability row from that
    position (section 4.7, row 2); the machine reconciles to `confirmed` plus the
    compensation path, to the cancel terminal on an acceptance closing negative, or
    to quarantine, and the test pins that no row re-dispatches, idempotency key
    included.
28. `effects.approval.expired-during-open-attempt`: the same windows under an
    `approval_expired` decision; a proven pre expiry execution confirms WITHOUT a
    compensation path (expiry bounds the grant, not the past), and no row
    re-dispatches after the crossing.
29. `effects.approval.revoked-while-awaiting-receipt`: the provider accepted before
    the revocation; the receipt confirms and the revocation incident opens the
    compensation decision (section 4.7, row 3), never a resurrection or a blind
    cancel.
30. `effects.append.ambiguous-ack-every-transition`: attempt, outcome, receipt,
    terminal, and disposition appends each lose their ack in turn; recovery reloads
    and finds its own operation id (section 4.3, item 2), so no duplicate transition
    rows, no fabricated open attempt, no early budget exhaustion, and no quarantine
    of a provably closed machine.

## 9. Telemetry

1. Gauges: `openEffectIntents` (consumed, not yet terminal), `oldestOpenIntentAgeMs`.
2. Counters by terminal class: `confirmed`, `refused`, `cancelledBeforeDispatch`,
   `compensated`, `quarantined`, plus `unknownEntered` as the pressure signal even
   though `unknown` is not terminal.
3. Duplicate classification: `duplicateReceiptsBenign`, `duplicateReceiptsConflicting`,
   and `incidentsOpen` for post terminal conflicts awaiting disposition.
4. The causal link: every receipt row carries the approval `entryRef`, the intent
   position, the epoch, and the accepted artifact hash, so "which approval licensed
   this transfer, for which accepted bytes, in which incarnation" is one query with no
   joins outside the journal.

## 10. The boundary, written down

1. Rulvar provides: the entry kinds and fold rules (consumption, void, terminals,
   incidents, epoch gating), the engine surfaces that append and recover, the
   conformance kit with the kill point catalog, reference behavior over the sqlite and
   postgres stores (the memory store participates only in single process conformance,
   because it is not leasable), and the telemetry above.
2. The host provides: provider integration (credentials, transport, webhooks,
   statement ingestion), IAM (which principals may approve, revoke, and disposition
   quarantines and incidents), the transactional database backing its own adapters and
   reconciler work queue, the deployment's declared clock skew bound, thresholds
   (compensation authorization, budget defaults), the restore procedure that bumps the
   store's restoration generation before the restored data is reachable (section 4.5,
   item 3), and retention policy beyond the run journal's own.
3. Promotion evidence lives with the host: conformance green against the host's store,
   the capability matrix filled per provider with each `lookup` qualification and
   every `neither` row acknowledged, the skew bound stated, and a quarantine and
   incident runbook naming principals.

## 11. Packaging decision

Split, with the cut at the fold:

1. Entry kinds and fold rules land in `@rulvar/core`. The replayer is the single
   authority on what a journal means; consumption semantics outside core would fork
   the fold. This mirrors how approvals themselves live in core.
2. The reconciler loop, receipt verification, provider capability adapters, and the
   conformance kit land in a new optional package `@rulvar/effects` (the
   `@rulvar/store-conformance` precedent: hosts that do not run effects pay nothing).
3. The dispatch seam for effects is its own adapter interface in that package, wired
   THROUGH the intent machinery by construction: there is no method on it that sends
   without an open attempt record, so the journal protocol cannot be bypassed by the
   seam that exists to honor it. The plain `ToolExecutorProvider` path stays what it
   is, the seam for sandboxed computation, and section 5 prohibits effect classes on
   it.
4. The executor ledger stays as is for non effect tools; the effect lane neither
   replaces nor requires it.

## 12. P0.4 acceptance criteria, answered

1. "At a crash at any point no intent retries blind": every crash window is a named row
   in section 8 distinguished by what the journal proves, recovery is derived from the
   capability matrix, and re-dispatch after an open attempt is licensed exclusively by
   provider side fencing (idempotency dedup, conditional create, acceptance closure);
   elapsed time licenses nothing, and rows without such fencing quarantine every
   ambiguous window instead of guessing, naming the possible late stale send in the
   record.
2. "A revoked scope is never consumed": consumption is a fold over the strict prefix
   (section 4.3); a prior revocation or expiry decision voids the intent, and every
   later window has its row in the section 4.7 state table (zero attempts cancels;
   an open attempt goes reconcile only with all re-dispatch disabled; a confirmed
   execution opens compensation), each pinned by a named conformance row, with no
   state outside the table because there is no state outside the journal order.
3. "Every intent deterministically reaches confirmed, compensated, or quarantined with
   durable evidence": every non terminal state carries an explicit journaled budget
   (attempts, lookups, receipt wait, authorization wait, and the overall
   `reconcileBy`), every exhaustion appends `quarantined`, terminals are immutable
   with post terminal facts folding as incidents, and `refused` plus
   `cancelled-before-dispatch` are the no effect terminals for intents that never
   dispatched. Evidence is the journal itself: one append per transition.

## 13. Deliberately deferred to the effects plan (plan 45)

1. Frozen TypeScript names, entry payload schemas, and store schema migrations,
   including the exact encoding of the effect lane store capability (section 4.4).
2. Default budget values (attempts, lookups, receipt wait, `reconcileBy`) and the
   skew bound's configuration surface.
3. The compensation authorization threshold surface.
4. Whether the reconciler ships a CLI verb (`rulvar effects reconcile`) in the same
   train as the SPI or one train later.
