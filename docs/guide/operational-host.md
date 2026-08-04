---
title: The operational host
description: The operational host reference (RV1705) - per-tenant engines by construction, revocable approvals, idempotent guarded effects, and the decision-chain audit fold, each proven by an executed example.
---

# The operational host

Rulvar is an embeddable engine, not a platform, and the planes a platform owns (identity, tenant mapping, secret distribution, business authority over effects, durable telemetry backends) are deliberately host responsibilities. What the library CAN do is make the reference arrangement of those planes cheap, explicit, and executable. The eighteenth comparison benchmark's operational acceptance put it as four behaviors a host must prove, not describe:

1. a tenant cannot read or effect across a tenant boundary;
2. a revoked approval is never executed;
3. a redelivered attempt cannot duplicate an external effect;
4. an audit reconstructs the decision chain.

This page walks the reference wiring for each; the runnable module is [`examples/src/operational-host.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/operational-host.ts), and its test executes all four behaviors through the full engine on `FakeAdapter` with zero live calls. Nothing below is a new capability; the reference host is an arrangement of shipped primitives.

## Tenants by construction

The wrong tenancy model filters a shared engine. The reference model gives each tenant its own engine instance, its own journal store, and only its own tools registered:

```ts
const engine = tenantHost({
  tenantId: 'alpha',
  adapter,
  routing: hostOwnedRouting,
  tools: alphaTools,
  store: new SqliteStore({ path: alphaDbPath }),
});
```

A cross-tenant tool name is then not "denied": it does not exist in the tenant's registry at all, and the model that asks for it receives a typed error tool result naming the unknown tool. A cross-tenant journal read has no store to read from. Every Rulvar registry (adapters, tools, profiles, prices, workflows) is engine-scoped precisely so this arrangement is the cheap default rather than an architectural feat; the executed test drives a model that tries the other tenant's tool by name and asserts the refusal reached it while the tenant's own read tool served.

The posture the factory sets beside the registry boundary: `strictApprovals: true` (a generic allow can never clear a `needsApproval` tool), an `ask` rule over every mutating or undeclared-risk class (`write`, `execute`, `destructive`, `undeclared`), and, when configured, `approvalDeadlineMs`, so an ask nobody answers denies by a journaled timeout resolution instead of waiting forever. What the factory deliberately does NOT provide: who is allowed to answer. Approval identity, quorum, and revocation policy are the host's authorization system; the engine's contract is only that no effect precedes a decision.

## Revocable approvals

An ask verdict suspends the tool call as a durable approval entry; the host resolves it through the same external-resolution surface everything else uses:

```ts
handle.on('approval:pending', (event) => {
  void handle.resolveExternal(ExternalRegistry.approvalKey(event.entryRef), {
    decision: 'deny',
    reason: 'revoked by the security desk',
  });
});
```

The deny lands PRE-EFFECT: the tool's `execute` never runs, the effect ledger records no intent, and the model receives the denial as an error tool result carrying the reason. The executed test asserts all three facts. A revocation flow is therefore a host policy loop over pending approvals: whatever your authorization system decides (an operator clicked deny, a grant expired, a policy changed between the ask and the answer), the engine's part is that an unresolved or denied ask has no effect to roll back.

## Idempotent guarded effects

The reference effect tool writes the ledger's intent row BEFORE the external effect and the outcome row after, both under a caller-owned idempotency key, and suppresses the side effect when the key is already claimed:

```ts
const shipReport = guardedEffectTool('ship-report', effects, memoryEffectLedger());
```

Redelivery safety then composes from two independent layers. A REPLAYED journal never re-executes a settled tool call at all: the executed test resumes the finished run on an adapter that throws if reached, and the effect count stays exactly one with zero live calls. A RETRIED attempt that genuinely reaches the effect again (the same logical delivery dispatched twice) finds the key claimed, fires nothing, and still closes its ledger attempt honestly, so the ledger shows two attempts and one effect: the reconciliation signal, not an untracked duplicate. Production hosts replace the in-memory array with their transactional outbox; the shape (intent, effect, outcome, idempotency key) is the contract.

## The decision-chain audit

`reduceDecisionChain(entries)` folds a run's journal into its authority record: every entry that admitted, approved, resolved, abandoned, or terminated something, in seq order, with back references intact and nothing invented (a field appears only when the entry recorded it).

```ts
const chain = reduceDecisionChain(await store.load(runId));
```

For the guarded-effect run above, the chain reads: the approval entry carrying WHAT was asked (the tool name, its input, its declared risk), the resolution that closed it referencing the ask by `seq`, and the `run_settle` decision after it. The executed test asserts exactly that shape. `auditRun` and the persisted terminal remain the settled-state authorities; the chain is the WHO-ALLOWED-WHAT view over the same bytes, one call instead of a hand-rolled kind filter.

## What stays yours

The reference draws the boundary the [production profiles guide](/guide/production-profiles) documents: the engine proves what happened, what it cost, and what was authorized; identity and tenancy mapping, secret distribution, the outbox that makes effects transactional, merge and deploy authority, HA storage operations, and the durable telemetry backend are host planes. A host that wires the four behaviors above has the mechanical floor of an operational deployment; everything on top is policy.
