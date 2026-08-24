[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/effects

# @rulvar/effects

The effect lane runtime (rfcs/effects.md): the adapter seam that cannot
send without an open attempt record, the provider capability matrix
(`idempotency-key`, qualified `lookup`, `neither`), the crash-window
recovery that is licensed exclusively by provider-side fencing, the
reconciler, receipt verification against a declared trust envelope, and
the kill point conformance kit. Consumption semantics (the fold and the
writer) live in `@rulvar/core`; hosts that do not run effects pay
nothing for this package.

Docs: https://docs.rulvar.com/guide/effects

## Classes

| Class | Description |
| ------ | ------ |
| [EffectDispatcher](/api/@rulvar/effects/classes/EffectDispatcher.md) | - |
| [EffectReconciler](/api/@rulvar/effects/classes/EffectReconciler.md) | - |
| [FakeEffectProvider](/api/@rulvar/effects/classes/FakeEffectProvider.md) | - |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [EffectAdapter](/api/@rulvar/effects/interfaces/EffectAdapter.md) | - |
| [EffectDispatcherOptions](/api/@rulvar/effects/interfaces/EffectDispatcherOptions.md) | - |
| [EffectDispatchRequest](/api/@rulvar/effects/interfaces/EffectDispatchRequest.md) | - |
| [EffectLookupRequest](/api/@rulvar/effects/interfaces/EffectLookupRequest.md) | - |
| [EffectProviderDescriptor](/api/@rulvar/effects/interfaces/EffectProviderDescriptor.md) | One provider row of the capability matrix (RFC section 6). |
| [EffectReceiptObservation](/api/@rulvar/effects/interfaces/EffectReceiptObservation.md) | What a provider hands back as evidence of an effect. |
| [EffectReconcilerOptions](/api/@rulvar/effects/interfaces/EffectReconcilerOptions.md) | - |
| [EffectsConformanceOptions](/api/@rulvar/effects/interfaces/EffectsConformanceOptions.md) | - |
| [EffectsTelemetry](/api/@rulvar/effects/interfaces/EffectsTelemetry.md) | - |
| [EffectSweepReport](/api/@rulvar/effects/interfaces/EffectSweepReport.md) | - |
| [EffectTrustEnvelope](/api/@rulvar/effects/interfaces/EffectTrustEnvelope.md) | - |
| [EffectTrustKey](/api/@rulvar/effects/interfaces/EffectTrustKey.md) | - |
| [RestorationReport](/api/@rulvar/effects/interfaces/RestorationReport.md) | - |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [EffectDispatchReport](/api/@rulvar/effects/type-aliases/EffectDispatchReport.md) | - |
| [EffectDispatchResult](/api/@rulvar/effects/type-aliases/EffectDispatchResult.md) | - |
| [EffectLookupAnswer](/api/@rulvar/effects/type-aliases/EffectLookupAnswer.md) | - |
| [EffectRecoveryReport](/api/@rulvar/effects/type-aliases/EffectRecoveryReport.md) | - |
| [FakeDispatchBehavior](/api/@rulvar/effects/type-aliases/FakeDispatchBehavior.md) | - |
| [ReceiptVerification](/api/@rulvar/effects/type-aliases/ReceiptVerification.md) | - |
| [ReceiptVerifier](/api/@rulvar/effects/type-aliases/ReceiptVerifier.md) | Trust-envelope verification of one receipt observation (the full envelope machinery is the reconciler train's; the seam is here). The default fails closed: an unverified receipt routes the machine to `unknown`, never to `confirmed`. |

## Variables

| Variable | Description |
| ------ | ------ |
| [EFFECTS\_KILL\_EXCLUSIONS](/api/@rulvar/effects/variables/EFFECTS_KILL_EXCLUSIONS.md) | Rows that do not apply per effect class (part of the kit contract). |

## Functions

| Function | Description |
| ------ | ------ |
| [effectIdempotencyKey](/api/@rulvar/effects/functions/effectIdempotencyKey.md) | The stable idempotency key: the logical key bound to its epoch. |
| [effectsConformance](/api/@rulvar/effects/functions/effectsConformance.md) | The kill point catalog as named checks (RFC section 8). |
| [effectsTelemetryOf](/api/@rulvar/effects/functions/effectsTelemetryOf.md) | - |
| [envelopeVerifier](/api/@rulvar/effects/functions/envelopeVerifier.md) | Adapts an envelope to the dispatcher's ReceiptVerifier seam. |
| [verifyReceiptObservation](/api/@rulvar/effects/functions/verifyReceiptObservation.md) | Verifies one receipt observation against the envelope. The order of checks is the RFC's: issuer identity, content bindings, key resolution with validity windows, revocation, then the signature itself. A receipt that binds fewer fields than its class requires verifies `unverified` no matter how good its signature is. |
