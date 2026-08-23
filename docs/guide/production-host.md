---
title: The production host reference
description: "The production host dossier (RV4307): the RACI of a production deployment, the runnable identity, routing, floor, and gate pieces, and the promotion evidence, with every example labeled Fake/VCR evidence and never production proof."
---

# The production host reference

An adoption review asks three questions and deserves one page: what does Rulvar provide, what must the host provide, and what evidence promotes a deployment from a demo to production. This dossier answers them, and everything runnable in it is executed by [`examples/src/production-host.test.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/production-host.test.ts) on `FakeAdapter` with zero live calls. That label is load-bearing and repeated on every table below: what a Fake/VCR test proves is that the arrangement works as described, never that a production deployment is correct. Promotion evidence is a separate column for exactly that reason.

## The RACI

| Plane | Rulvar provides | The host provides | Promotion evidence |
|---|---|---|---|
| Identity of a run | `ExecutionScope` dimensions recorded at genesis, the declarative value normalization table journaled beside them (RV4302), the canonical `scopeDigest` on the genesis decision and the invoice header, and the resume assertion over the recorded identity | The dimension values, their mapping to real tenants and accounts, and the IAM that decides who may start a run for whom | A run per tenant in the staging environment whose genesis decisions and invoices join by digest to the host's own billing records |
| Provider account routing | The `providerAccount` dimension as recorded identity | The mapping from the recorded account to a concrete adapter, key, and billing account, fail closed on unknown accounts | A routing table review naming every account, plus a refused run for an unregistered account |
| The assurance floor | `compileRegulatedProfile` v4: refuses loosening by field name, requires the deliverable contract, fills the production resolver and persistence, hashes the posture into `regulated:4:<profileHash>` | The validators (the host's own acceptance criteria), the citation snapshot resolver, the judge routing, and the budget ceilings | The compiled `profileHash` pinned in the deployment config, and a red test proving a loosened posture refuses |
| Acceptance | `semanticTerminalVerdict` on every terminal and `productionAcceptable` as the one gate, the same predicate `rulvar drive --acceptance-policy production` exits on | The pipeline that holds every deliverable against the gate and the disposition path for refusals | A pipeline run refusing a `waived` and a `not-judged` terminal, recorded |
| External effects | The DESIGN: state machines, the journaled consumption protocol, the capability matrix, and the kill point catalog in the effects RFC (architecture below); runtime is the dedicated effects plan's scope (plan 45) | Today: every effect path, transactional outbox, provider integration, and reconciliation; after the effects plan: the provider adapters, IAM, thresholds, and runbooks the RFC assigns to the host | The RFC's promotion checklist (below), answered in writing per provider |
| Durability and storage | The journal contract, the store conformance kit, leases and fencing, PITR reconciliation semantics for runs | The database, its backups, the restore runbook, and the operational ownership of both | Store conformance green against the HOST'S deployed store, and one rehearsed restore |
| Observability | Events, invoices, cost reports, the decision chain fold, capacity sheets with provenance (RV4304) | The telemetry backend, dashboards, alerting, and retention | Dashboards fed by a staging run, and an alert that fired on a forced refusal |

## The runnable pieces

Four arrangements, each a shipped primitive and nothing new; the module is [`examples/src/production-host.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/production-host.ts). Inline fences in this page pass the syntax gate only and are NOT compiled; the compiled truth is the examples test in CI.

Composite identity with one canonical form (RV4205/RV4302): the run options carry the full dimension set and the normalization table, so `' EU-West-1 '` and `'eu-west-1'` are one identity on the genesis decision, the invoice, and the resume assertion:

```ts
const outcome = await engine.run(wf, undefined, {
  runId,
  ...productionRunOptions({ budgetUsd: 5, scope: rawScope }),
}).result;
```

Provider account routing as a host decision, fail closed (the recorded identity picks the adapter or nothing does):

```ts
const adapter = providerAccountAdapter(scope, { 'ant-prod-7': anthropicProd });
```

The regulated floor v4 (RV4303), compiled from the host's own contract; the returned fingerprint reads `regulated:4:<profileHash>` and the resume assertion machinery pins it:

```ts
const profile = productionRegulatedProfile({ engine, budgetUsd, scope, resolve, judgeModel, validators });
```

The production gate (RV4209), the exact predicate `rulvar drive --acceptance-policy production` exits on; fail closed on a terminal nothing judged:

```ts
const verdict = productionGate(outcome.envelope);
```

## External effects: architecture and promotion checklist

The full design lives in the effects RFC, [`rfcs/effects.md`](https://github.com/o-stepper/rulvar/blob/main/rfcs/effects.md), and this section deliberately stops at architecture: the runtime is the dedicated effects plan's scope (plan 45; plan 44 answered the seventh comparison experiment instead), and this dossier promises no runnable outbox or reconciler before it exists. The architecture in one paragraph: an effect is a journal protocol, not a tool call. Consuming an approval and recording an intent is ONE append whose verdict is a fold over the journal prefix; re-dispatch after an ambiguous send is licensed only by provider side fencing (idempotency keys, conditional create, acceptance closing cancel), never by elapsed time; terminals are immutable and late facts become linked incidents; and providers without any fencing quarantine their ambiguous windows for a human instead of guessing.

The promotion checklist a host answers per provider, in writing, before any effect class goes live (each item is a section of the RFC):

1. Which capability row the provider earns (`idempotency-key`, `lookup` with its qualification named, or honestly `neither`), and who signed off on the classification.
2. The store capability for the effect lane (leased appends enforced, the restoration generation wired into the restore runbook).
3. The declared clock skew bound, or the decision to restrict effects to provider fenced rows.
4. The budgets (attempts, lookups, receipt wait, `reconcileBy`) and the compensation authorization threshold.
5. The quarantine and incident runbook: who dispositions, on what evidence, within what time.

## Residency, retention, statements, rollout

Every row below is exercised by Fake/VCR tests in this repository; none of it is production proof, and the promotion evidence column of the RACI is where proof lives.

| Concern | The mechanism (Fake/VCR evidence, not production proof) |
|---|---|
| Residency | The `region` and `legalDomain` dimensions are recorded identity; routing by them is the host's adapter mapping, exactly the provider account arrangement above |
| Retention | `Engine.deleteRun` cascades over the run's journal, transcripts, and candidate blobs; candidate bytes absent by policy read `bytesUnavailableReason`, never silence (RV4207) |
| Statement ingestion | `reconcileStatement` holds the journal's invoices against a provider statement export; billing truth is the statement, the invoice is the claim |
| Rollout gates | The release train enforces coverage thresholds and reads the live contract classification strictly before publish (RV4306); a deployment inherits that discipline by consuming released versions only |
| Runbooks | The refusal surfaces are typed and named (floor refusals, gate refusals, resume assertions), so a runbook keys on error names instead of log archaeology |

## What promotion means here

A deployment is promotable when every RACI row's evidence column is filled with artifacts from the HOST'S environment: conformance against its store, a rehearsed restore, dashboards from its telemetry, a refused loosening, a refused unjudged terminal, and the effects checklist answered per provider. The examples in this repository demonstrate the arrangement; they are Fake/VCR evidence by construction, and calling them anything more would be exactly the laundering this page exists to refuse.
