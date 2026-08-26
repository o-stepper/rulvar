# RFC: host capability attestation

Status: DRAFT (RV4605, plan 46). Design only; no runtime ships with this document, and
code lands only after this RFC survives review. The construction posture precedent
(RV4101) is the model: an attestation is a CLAIM a party signs, verified for presence,
shape, and version, never for truth, and the hash names its own blind spot instead of
implying totality.

Scope: the P1.4 remainder of the seventh comparison experiment's improvement plan. The
same item's other halves already shipped: `sponsor` is a first class `ExecutionScope`
dimension and the scope digest is journaled and verified on resume (RV4408); the
regulated construction posture walks the risk bearing constructions into the profile
hash (RV4101/RV4102). What has NOT shipped is the deployment side declaration: a
regulated profile today can demand nothing about the HOST PLANE the run will live in,
so a host that wires labels and budgets but no IAM, no durable queue, and no
reconciliation can still compile the strictest profile Rulvar knows.

## 1. Problem and evidence

The seventh comparison experiment's candidate put it plainly, and the independent audit
graded the claim supported: the engine's scope is an attribution envelope, not IAM
(`packages/core/src/engine/engine.ts:825` at the frozen tree), the CLI server has no
built in authentication, and the regulated posture the profile hash covers stops at the
constructions the OPTIONS reach. A regulated host (the Aster shape: tenant, legal
domain, region, sponsor, provider account) can therefore mistake the presence of scope
labels for the presence of authority: every Rulvar side gate is green while the host
plane behind it is a sketch.

The experiment asked for a host capability manifest with a deliberately host shaped
list: IAM, durable queue, regional fencing, effect outbox, statement reconciler,
disaster recovery. Since then plan 45 moved the boundary: `@rulvar/effects` ships the
admission queue, fencing, dispatcher, receipts, reconciler, and the kill point
conformance kit as LIBRARIES, and `rfcs/effects.md` records which obligations remain
host owned. The manifest this RFC proposes is therefore SMALLER than the one the
experiment asked for, and that shrinkage is the argument for doing it now: the
remaining list is short, stable, and genuinely outside Rulvar's ability to verify.

## 2. Verified surfaces this design builds on

1. The construction posture SPI (`describeRegulatedPosture`, RV4101): a pure snapshot
   of construction time choices, folded sorted into the hashed posture map beside an
   `unrecognized` count. Re-assertion at use (RV4102) holds the compile-to-use window;
   the cross process half is held by the profile hash riding the RV3210 resume
   fingerprint (`regulated:<VERSION>:<profileHash>`).
2. The scope digest and `sponsor` (RV4408/RV4007): the normalized scope is hashed,
   journaled at genesis, immutable for the life of the run, and re-verified on resume.
3. The effects libraries (plan 45): `@rulvar/effects` owns the admission queue,
   fencing epochs, the dispatcher, receipts, the reconciler, and the conformance kit;
   the effect lane's journal seam is one append contended through `(runId, seq)`
   uniqueness (rfcs/effects.md section 4).
4. The regulated floor's discipline (RV4407 and the production profiles guide): the
   floor moves on evidence, and a capability it cannot verify is named in prose, never
   silently implied by a hash.

## 3. Design: a declarative attestation, verified for presence and version

A host constructs an attestation value and passes it to `compileRegulatedProfile`;
the profile declares which capability KEYS it requires and at which minimum claim
versions. Everything is data; nothing probes.

```ts
interface HostCapabilityAttestation {
  /** Shape version of this declaration; bumps when the meaning changes. */
  attestationVersion: 1;
  /**
   * Monotonic generation of the host plane this attestation describes.
   * A redeploy that changes any claimed capability bumps it; the
   * profile may bound acceptable staleness (see section 5).
   */
  generation: number;
  /** Who signs the claim: an operator identity, never a Rulvar concept. */
  attestedBy: string;
  /** ISO instant of the attestation; staleness is judged by the host's bound. */
  attestedAt: string;
  capabilities: {
    iam?: { claimVersion: number; principalNamespace: string };
    durableQueue?: { claimVersion: number; atLeastOnce: true; leased: boolean };
    regionalFencing?: { claimVersion: number; regions: readonly string[] };
    effectOutbox?: { claimVersion: number; transactional: boolean };
    statementReconciliation?: { claimVersion: number; cadence: string };
    disasterRecovery?: { claimVersion: number; measuredFailover: boolean };
    residency?: { claimVersion: number; regions: readonly string[] };
  };
}
```

The compile side mirrors the construction posture fold exactly:

1. `compileRegulatedProfile({ ..., hostAttestation, requireHostCapabilities })`
   refuses BEFORE genesis when a required key is absent, when a claim version is
   below the declared minimum, when the shape is malformed, or when the generation
   violates the declared staleness bound. The refusal names the key and the field,
   the RV4009 posture.
2. The attestation folds, sorted and JCS canonical, into the profile hash beside the
   construction postures, so the resume fingerprint (`regulated:<VERSION>:<hash>`)
   already carries it: a resume under a different host plane declaration refuses
   through the existing RV3210 seam with zero new machinery.
3. An `unattested` count rides the compiled posture map for required-but-optional
   shapes the host chose not to claim, the `unrecognized` twin: the hash names its
   own blind spot.

## 4. What Rulvar deliberately does not do

- No probing, no connectivity checks, no runtime verification that the claimed IAM or
  queue or reconciler exists or behaves: an attestation is evidence FOR AUDIT, and a
  claim Rulvar cannot verify must not imply verification (the RV4009 doctrine that
  kept construction postures out of the hash until they became verifiable claims).
- No IAM, no identity mapping, no secret distribution, no deploy authority: the
  operational host guide's boundary stands byte for byte.
- No capability DISCOVERY: the host writes the attestation by hand or from its own
  deploy pipeline; Rulvar never enumerates what a host could do.
- No new signature scheme in v1: `attestedBy` is a recorded identity like a waiver's
  `principal` (RV4003), not a cryptographic signature. Section 5 leaves the upgrade
  open.

## 5. Open questions for review

1. Signature: is the waiver style recorded principal enough for v1, or must the
   attestation carry a detached signature a host key verifies? (The waiver precedent
   says recorded principal; the effect lane's receipts precedent says verify.)
2. Staleness: is the generation bound declared in the profile (`maxGenerationAge`,
   attested-at age, or both), and does a stale attestation refuse at compile only or
   also at resume?
3. Granularity: one attestation per deployment, or per cell (the Aster fourteen cell
   shape)? A per cell attestation would ride `ExecutionScope.region` naturally.
4. Placement: does the attestation live in `@rulvar/core` beside the regulated
   profile, or in `@rulvar/effects` beside the host obligations it describes? The
   compile seam argues core; the vocabulary argues effects.
5. Does `preflightEstimate` surface a missing required capability as an error finding
   (the output contract precedent), so a JSON config host sees the refusal without
   constructing an engine?

## 6. Acceptance sketch (from the experiment's P1.4, updated to the shipped surfaces)

- An Aster shaped profile refuses BEFORE genesis at a missing or unknown sponsor
  (shipped, RV4408), an undeclared scope digest (shipped), or an absent required host
  capability (this RFC).
- Resume verifies the same digest and version through the existing fingerprint; a
  changed attestation is a changed profile hash and refuses typed (this RFC, zero new
  resume machinery).
- Regression tests: missing key, claim version below minimum, malformed shape, stale
  generation, unattested count, fingerprint drift on redeploy, and the negative
  control that a non regulated engine never reads the attestation at all.
