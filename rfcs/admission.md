# RFC: durable admission and fairness over composite scope

Status: IMPLEMENTED (plan 45, trains RV4507 to RV4510): the AdmissionScheduler SPI and
the pure algorithms (hierarchical SFQ, sliding window, token bucket, JCS level keys) in
@rulvar/core with the single-process reference scheduler; durable documents in
@rulvar/store-sqlite and @rulvar/store-postgres; the twelve-row conformance matrix in
@rulvar/store-conformance; and the engine run bracket (createEngine admission). Recorded
deviations and first shapes: (1) the durable form is the WHOLE scheduler state as one
atomically CASed document, the section 10 single-scheduler shape made literal (per-row
schemas are an optimization the SPI does not require); (2) release grants nothing
implicitly, pump is the observable grant event; (3) the grant scan is bucket-blocking
(a refused ticket blocks ITS bucket for the pass, no intra-bucket overtake, independent
buckets proceed), which is the no-starvation rule stated operationally; (4) the engine
bracket's first-shape cover is the full reservation and its release actuals equal the
reservation, both recorded in the bracket's doc; (5) a settled unit re-admits under the
same identity while `denied` stays terminal; (6) `rebind` joined the SPI to carry
section 4.2 item 4's atomic failover transfer, pinned by conformance row 11.
Originally: accepted design (RV4302, plan 43), hardened by an adversarial review pass
(5 blocker findings; every one incorporated). The declarative scope value normalization
table shipped with the plan 43 train (section 5).

Scope: P1.4 of the sixth comparison experiment's improvement plan (durable fairness and
admission by composite scope). Out of scope: changing the semantics of the pinned RV708
fixed epoch windows (section 2, item 4).

## 1. Problem and evidence

1. The fixed epoch minute window admits a double burst across the boundary: a tenant can
   spend a full minute cap in the last seconds of one epoch and again in the first
   seconds of the next. This is the documented RV708 compromise, pinned, not a bug.
2. Concurrency limits are engine local; two engine processes sharing a provider account
   cannot see each other's in flight wires except through a shared `QuotaLimiter`.
3. `QuotaLimiter` is a live only reserve/reconcile/release seam by explicit contract
   (the engine never journals limiter interactions). Weighted fairness and absence of
   starvation are queue properties over durable state; they are not provable, and not
   even expressible, through a live counter seam.
4. The experiment's run recovered from 5 pre wire quota denials, which demonstrates
   bounded retry, not fleet fairness: nothing ordered that run against competing
   tenants, and nothing durable survived a crash of the waiting process.

## 2. Verified surfaces this design builds on

1. `QuotaLimiter` (`l0/spi/quota.ts`): `reserve` is the admission point; `reconcile` is
   idempotent settlement against actual usage, including `actual.requests` for provider
   side continuations (RV905); optional `release` returns an unused admission (RV1013).
2. `QuotaReservationRequest` carries `provider`, `model`, optional `tenant` (the run
   scope's under `quota.tenantFrom: 'scope'`), and the run's normalized scope
   dimensions (RV4205); there is no digest field on the request, and rule addressing in
   the shipped limiters is by rule index (memory) or canonical rule content (sqlite,
   postgres).
3. Scope dimensions are validated and normalized at genesis (`normalizeExecutionScope`),
   digested by `executionScopeDigest`, and journaled in the `execution_scope` genesis
   decision; RV4302's code half adds the declarative value normalization table applied
   before any digest exists.
4. RV708 fixed epoch windows remain the pinned semantics of the existing rate caps;
   nothing here redefines them. The admission layer designed below sits beside them,
   and a deployment that wants sliding behavior gets it from the new layer, not from a
   silent change to the old one.
5. Retry and continuation debt are already partially expressed: a retry re-reserves
   (each attempt is its own admission), provider continuations enter
   `reconcile(actual.requests)`, and an unused pre wire reservation is released. The
   gap analysis in section 6 starts from these three paths.

## 3. The split: two SPIs, not one

The design separates concerns that the P1.4 proposal listed together:

1. The wire quota SPI is the existing `QuotaLimiter`, unchanged: a hot path counter
   consulted before every live dispatch, live only, idempotent settlement, no ordering
   guarantees. It answers "may this wire fly right now".
2. The durable admission SPI is new: a scheduler and queue seam that answers "when may
   this work START, and in what order relative to competing tenants". It owns tickets,
   ordering, leases, refunds, and replay semantics, all durable.

Why the split is load bearing:

1. Fairness is an ordering property over waiting work; a counter has no queue and
   cannot starve or unstarve anyone. Folding a queue into `QuotaLimiter` would force
   durability onto a seam whose contract says live only, breaking every shipped
   implementation and the engine's own "never journaled" invariant.
2. The two seams degrade independently and honestly: a deployment with only the
   limiter keeps today's exact behavior; a deployment adding admission gets ordering
   and starvation freedom without touching wire accounting.
3. The admission ticket brackets a whole unit of work (a run, a phase, a reserved
   burst); the quota reservation brackets one wire. Their lifetimes differ by orders
   of magnitude and their refund semantics differ in kind (section 4).

## 4. The durable admission SPI, designed

Vocabulary (frozen by plan 45 as l0/spi/admission.ts; the shipped names):

1. `AdmissionTicket`: the durable record of one admitted unit of work. Fields: the
   caller minted unit identity `(unitId, generation)` (below), the resolved effective
   tenant (section 4.1), the normalized scope dimensions, the requested preflight
   reservation (section 4.3), consumption checkpoints (section 4.3), the ordering
   state (section 4.2), grant time, lease, and state
   (`queued | granted | released | refunded | expired | denied`). `denied` is a
   TERMINAL verdict distinct from waiting in `queued`: an infeasible request refuses,
   it never camps at the head of a queue.
2. Creation is a conditional create under the caller minted `(unitId, generation)`
   key: enqueueing the same unit twice returns the SAME ticket, so a caller that
   crashed after enqueue and before retaining the ticket id recovers its ticket by
   its own identity instead of minting an orphan grant plus a duplicate queue entry.
   Every lifecycle call (grant, renew, release, cancel, settle) carries a stable
   operation id and is idempotent by it, and each transition updates the ticket state
   AND all matched bucket rows in one transaction or CAS, so no crash between "state
   moved" and "buckets moved" can double count or leak capacity.
3. Lease: a granted ticket carries a lease with expiry; work that neither renews nor
   releases lets the lease expire, and expiry settles the ticket conservatively
   (section 4.3, never a blind full refund). The store lease seam already shipped for
   run ownership; the admission lease reuses the pattern, not necessarily the type.
4. Cancellation: a queued ticket may be cancelled (removed, nothing to refund); a
   granted ticket is released (settlement per section 4.3). Both are durable
   transitions arbitrated by the same operation id rule as item 2: of a racing
   release, expiry, and cancel, exactly one wins per ticket, and the losers are
   durable no ops, never second refunds.
5. Replay and resume: tickets are durable rows, not journal entries of a run; a
   resumed run recovers its ticket by `(unitId, generation)` (never by hoping it
   retained the id), and the scheduler answers `granted` (lease renewed), `expired`
   (re-queue), or `unknown` (re-queue; the conservative direction). The run journal
   never records scheduler state, mirroring the limiter's live only doctrine:
   admission is an environmental fact, and replay of a run must not depend on it.

### 4.1 Buckets: hierarchical and concurrent

Admission consumes capacity at every matched level ATOMICALLY, or not at all:

1. Level 1: the RESOLVED effective tenant, computed by exactly the existing
   `tenantFrom` resolution the limiter request uses: the engine configured tenant by
   default, the scope's `tenant` only under `quota.tenantFrom: 'scope'`. The
   admission request carries this resolved value as its own field, the
   `QuotaReservationRequest.tenant` precedent, so the two seams debit the SAME
   identity; deriving level 1 from `scope.tenant` unconditionally would let an
   engine-tenant deployment debit one tenant in the limiter and another (or none) in
   admission. A request where both identities are present and disagree is refused
   typed unless the deployment declared `tenantFrom: 'scope'`, which is the one
   configuration in which the disagreement has a documented meaning.
2. Level 2: the resolved effective tenant plus `providerAccount`.
3. Level 3: the full scope digest (every declared dimension).

Rationale: a bucket keyed only by the full digest lets a tenant multiply buckets by
varying `project` or `region` and evade its own tenant cap; a bucket keyed only by
tenant cannot express per provider account concurrency. The rule mirrors the shipped
quota rule doctrine ("every matched rule must admit"): all matched levels must admit,
and a denial at any level consumes nothing at any level.

Bucket addressing: the SPI carries the normalized scope dimensions on the request
(exactly like `QuotaReservationRequest.scope` today) and the implementation derives
each level's bucket key deterministically as the JCS serialization of the level's
projected sub scope. The alternative, a new explicit digest field on the request, is
rejected: a single digest freezes one projection, and the levels need three different
projections of the same dimensions. The choice is recorded here so the shipped
limiters' addressing split (rule index in memory, canonical rule content in sqlite and
postgres) does not leak into the new seam: level keys are canonical bytes everywhere.

### 4.2 Algorithms

1. Sliding window: per bucket, a ring of sub window counters (for example six ten
   second slots per minute) admits when the trailing sum is under cap. This bounds the
   RV708 double burst to one sub window's worth, a documented burst allowance, not a
   silent fix of the pinned semantics.
2. Token bucket: per bucket refill rate plus burst size; the deployment picks sliding
   window or token bucket per level, and the choice is part of the durable config.
3. Weighted fair queue, ONE algorithm, stated fully and reproducibly: START TIME
   FAIR QUEUING (SFQ), hierarchical (first across tenants, then across provider
   accounts within the chosen tenant). The service cost of a ticket is its reserved
   WIRES, the one scheduler unit; tokens, dollars, and exposure are reservation
   dimensions that gate feasibility, never scheduling cost, so the cost function is
   total. Persistent per queue state is exactly (virtual time `V`, per member finish
   tag). The rules, all of them: a ticket's start tag is max(its member's finish
   tag, `V` at arrival); its finish tag is start tag plus cost over weight; the
   grant takes the smallest START tag (SFQ's ordering, which is what makes `V`
   computable without fluid simulation), with arrival seq (store assigned, totally
   ordered per queue) breaking ties deterministically; and `V` advances to the
   start tag of each ticket as it is granted (initially 0, never decreasing). Two
   scheduler replicas over the same durable state therefore grant identically. An
   idle member's stale finish tag is capped by the max in the start tag rule (no
   credit hoarding beyond the configured burst size). Feasibility is judged at
   enqueue: a request whose reservation exceeds a matched bucket's TOTAL capacity
   can never fit, refuses as the terminal `denied` verdict, and never camps at the
   head starving the queue behind it; a feasible oversized ticket waits with tags
   proportional to its cost, which is the bounded interval the no starvation claim
   (section 8) rests on.
4. Per provider account concurrency: a semaphore per level 2 bucket, decremented at
   grant and restored at release; at EXPIRY it is restored only when the holder's
   further execution is fenced, else it parks for operator release (section 4.3,
   item 4; a possibly live holder may still occupy the slot, and a semaphore that
   auto restores under it admits one worker too many). Durable, so two scheduler
   replicas agree.
   Failover moves the semaphore BEFORE the target dispatches: the ticket rebind is
   an atomic transfer that acquires the target hierarchy's capacity first and
   releases the source hierarchy in the same transaction; a failed transfer leaves
   the source binding unchanged and the target undispatchable, so no window exists
   in which work runs on a provider account whose slot it never held.
5. Emergency reserve: a configured fraction of each cap admits only work flagged by the
   host as emergency (compensation effects, incident runbooks). The flag is host IAM's
   problem; the scheduler only enforces the reserve.
6. Preflight reservation: section 4.3.

### 4.3 Preflight reservation and refunds

A ticket reserves, per level, up to four measures: wires, tokens, dollars, exposure.

1. Reservation happens at grant, atomically across levels with the admission itself.
2. Consumption covers, checkpoint THEN consume: the holder durably checkpoints a
   cover for the next batch BEFORE consuming it (the executor ledger's intent
   before effect doctrine, applied to capacity), so for a conforming holder the
   cover is an UPPER bound on consumption by construction, not a trailing report.
   Covers are monotone high water marks, idempotent by operation id, and they are
   lease carried writes: a store that fences the expired lease rejects further
   cover writes, and a conforming holder that cannot extend its cover consumes
   nothing more. That chain (consume only under a committed cover; covers fenceable
   with the lease) is what makes the fenced refund of item 4 provable rather than
   optimistic; a report written AFTER consumption would bound nothing.
3. Release settlement: at release the holder reports actuals (typically from the
   invoice); the unused remainder refunds to each level, over consumption beyond the
   reservation is recorded as debt on the bucket (it never denies retroactively, the
   reconcile doctrine), and the debt depresses the bucket's available capacity going
   forward until aged out.
4. Expiry settlement is CONSERVATIVE, because expiry proves nothing: not what the
   holder consumed, and not that it is dead. The rule is two tiered on the cover
   discipline of item 2: when covers are lease fenced (the store rejects the
   expired lease's cover writes) and the holder conforms (consumes only under a
   committed cover), the cover is an upper bound and expiry refunds reservation
   minus the covered high water mark, provably unused by construction; without
   fenced covers, expiry auto refunds NOTHING, and the entire unreleased remainder
   parks in a quarantine lane for operator release or ages out on the bucket's own
   window, the limiter's age out precedent. Either way a late settlement arriving
   after expiry is accepted idempotently and lands as bucket debt rather than being
   discarded as a duplicate.
5. Race arbitration: of release, expiry, and cancel, exactly one transition wins per
   ticket (section 4, item 4), so the double refund hazard is closed by arbitration
   plus idempotence, not by hoping the orders never interleave.

## 5. Interaction with what exists

1. The engine keeps consulting `QuotaLimiter` per wire, unchanged, even under a granted
   ticket: the ticket bounds the unit of work, the limiter bounds each wire, and the
   two disagree only in the direction of extra safety (a granted ticket never exempts a
   wire from quota).
2. The effective tenant reaches the admission request through the SAME `tenantFrom`
   resolution the limiter request uses (section 4.1, item 1): engine configured by
   default, the scope's only under `tenantFrom: 'scope'`. The request also carries
   the normalized dimensions, so a scope typo cannot create a fresh bucket (the
   RV4302 normalization table already canonicalized values before any digest).
3. Fixed RV708 windows stay pinned; deployments that keep only the limiter see zero
   behavioral change.
4. The RV4302 code half (the declarative `scopePolicy.normalize` table, journaled in
   the genesis decision, applied before any digest, refused on conflicting resupply at
   resume) is the reason bucket keys are trustworthy: without value normalization,
   `Region` and `region` values split one tenant's traffic across two buckets and
   under count both.
5. The engine bracket's wait and lease seams, hardened (RV4804). The queued wait
   honors a verdict's `retryAfterMs` verbatim for its next sleep, with `pollMs` as the
   fallback cadence, and it ends with the RUN: the run's cancel signal (host abort and
   the deadline both ride it) stops the wait, cancels the ticket best effort, and hands
   the run to its own cancellation machinery, where before a cancelled run polled the
   queue forever. Renew failures are announced, never fatal: the first failure warns,
   a verify `recover` that no longer answers `granted` emits `admission:lease-lost`
   once (the scheduler expired the grant and may re-admit the capacity while the
   holder is alive), and the run continues, because item 1 already gates every wire
   and the settle release is idempotent. On the store side, the postgres scheduler
   takes its schema-scoped advisory lock under a `lock_timeout` bound
   (`lockTimeoutMs`, default 10 seconds): a holder that hangs mid-transaction used to
   block every lifecycle call of the whole fleet forever, and past the bound the call
   refuses with the typed retryable `LeaseHeldError` instead of camping.

## 6. Gap analysis: debt the current paths do and do not express

| debt path                               | expressed today                                     | remaining gap                                                                                                                     |
| --------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| transport retry                         | each attempt re-reserves; denial is a synthetic 429 | retry storms are unordered against other tenants; no queue position survives a crash                                              |
| provider continuation                   | `reconcile(actual.requests)` adds the true count    | the extra requests never passed admission; a continuation heavy tenant under counts at grant time                                 |
| unused pre wire reservation             | `release` returns the admission (RV1013)            | release exists per wire only; no unit of work refund without the new ticket                                                       |
| crashed process mid wait                | nothing: the wait was in memory                     | queued position must be durable (ticket state `queued`)                                                                           |
| cross segment debt (resume after crash) | invoice records spend; limiter forgot it            | settlement debt on the bucket (section 4.3, item 3) is the design answer                                                          |
| failover to another model               | re-reserved under the new dimensions                | the ticket spans the failover; the atomic pre dispatch rebind (section 4.2, item 4) moves the level 2 slot BEFORE target dispatch |

## 7. Conformance test matrix (future names)

1. `admission.fairness.sixty-tenant-synchronized-burst`: 60 tenants, equal weights,
   one provider account; over a fixed horizon every tenant's granted raw service
   (reserved wires) is within tolerance of 1/60 of the total, and no tenant's inter
   grant interval exceeds the algorithm's bound. Wait p95 is reported, not the
   acceptance metric: service share is what the algorithm actually guarantees.
2. `admission.fairness.weighted-shares`: weights 1/2/4; granted RAW service
   converges to the 1:2:4 ratio over the horizon, equivalently NORMALIZED service
   (raw over weight) equalizes across the three; no tenant at weight 1 starves.
3. `admission.window.minute-boundary`: the sliding window bounds the epoch boundary
   burst to the documented sub window allowance.
4. `admission.crash.queued-ticket-survives`: kill the scheduler holder; the queued
   ticket re-loads with its arrival seq and finish tag (no queue jump, no loss), and
   re-enqueueing the same `(unitId, generation)` returns the SAME ticket instead of a
   duplicate.
5. `admission.crash.granted-lease-expiry-settles-conservatively`: kill the work
   holder mid consumption; with lease fenced covers expiry refunds reservation
   minus the covered high water mark (and the arm proves a stalled holder cannot
   consume past its cover once the fence rejects its cover write), without them it
   auto refunds nothing and the remainder parks; in both arms a late settlement
   lands as debt instead of being discarded, and the semaphore never restores under
   a possibly live holder.
6. `admission.deny.429-parity`: an admission denial surfaces as the same synthetic
   rate limit class the limiter uses, with `retryAfterMs` honored verbatim; the
   terminal `denied` verdict (infeasible reservation) is distinguishable from
   `queued` by state, not by timeout.
7. `admission.region.loss`: deleting a region's buckets re-routes admission without
   double granting in flight tickets.
8. `admission.repair.hundred-percent`: a workload of 100% repair rounds (the worst
   amplification) stays inside caps and inside fairness tolerance.
9. `admission.scope.foreign-scope-never-consumes`: a request whose dimensions match no
   configured bucket family consumes nothing anywhere (fail closed admission is a
   refusal, never a silent global bucket).
10. `admission.atomicity.multi-level-all-or-nothing`: a denial at level 2 leaves level
    1 and level 3 counters untouched.
11. `admission.failover.rebind-before-dispatch`: the failover transfer acquires the
    target provider account slot before the source releases, in one transaction; a
    failed transfer leaves the source binding unchanged and the target never
    dispatches.
12. `admission.tenant.resolution-parity`: the effective tenant on the admission
    request equals the limiter request's under both `tenantFrom` postures, and a
    conflicting pair of identities refuses typed outside `tenantFrom: 'scope'`.

## 8. P1.4 acceptance criteria, answered

1. "No tenant starves": start time fair queuing with positive weights bounds every
   active member's inter grant interval by (max feasible ticket cost over its
   weight) relative to queue throughput, and infeasible tickets are refused at
   enqueue instead of camping at the head; tests 1 and 2 measure granted service,
   which is the property itself rather than a proxy.
2. "Caps violated only by the documented burst allowance": sliding window sub slot
   bound (test 3); token bucket burst size is config, not accident.
3. "Reservations and refunds survive crash": durable tickets, conditional create by
   unit identity, and conservative expiry settlement (tests 4 and 5).
4. "Foreign scope never consumes a bucket": normalization before digest plus fail
   closed bucket matching (test 9).

## 9. Packaging decision

1. The admission SPI types land beside the quota seam in `@rulvar/core`
   (`l0/spi/admission.ts`): the engine must be able to consult a configured scheduler
   without importing a host package, exactly like `QuotaLimiter`.
2. Reference durable implementations land in `@rulvar/store-sqlite` and
   `@rulvar/store-postgres` (the quota rules precedent: those packages already carry
   durable rule addressed limiters and the migrations machinery).
3. Conformance lands in `@rulvar/store-conformance` beside `quota-rules.ts`, with the
   matrix of section 7.
4. No new package: P1.4 allowed a separate host package, and the answer is that the
   store packages ARE the host packages for durable seams in this repository.

## 10. Deliberately deferred (still open after plan 45)

1. Frozen TypeScript names and the exact ticket state chart encoding.
2. The scheduler's multi replica story beyond deterministic ordering (single scheduler
   with durable state is the first shipped shape).
3. Integration with the effects lane (an effect intent as an admission unit) once
   `rfcs/effects.md` machinery exists.
