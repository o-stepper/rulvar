---
title: Data protection
description: "PII never persists or emits in plaintext under policy: envelope encryption over the serialization hook with KMS-shaped key management, host redaction patterns at the telemetry boundary, portable run export and import, salted metadata digests, and the audit trail reducer."
---

# Data protection

Runs carry sensitive content by nature: prompts quote users, tool results carry records, transcripts hold whole conversations. This page is the policy toolkit for the two places that content can leave the process, persistence and telemetry, plus the compliance surfaces around them (export, deletion, audit). The gate all of it serves: **PII never persists or emits in plaintext under policy.**

The division of labor is deliberate:

| Boundary | Tool | Why |
|---|---|---|
| Persistence (journal, transcripts) | **Envelope encryption** over the [serialization hook](#envelope-encryption) | Lossless and reversible: replay, content keys, and the folds need the original bytes back. Lossy redaction of the journal would corrupt determinism, so it is a deliberate host trade, never a default. |
| Telemetry (events, traces) | **Redaction patterns** on the [masking policy](#redaction-patterns-at-the-telemetry-boundary) | Telemetry is lossy by design and leaves your trust boundary first. Masking there cannot perturb replay: events are excluded from identity by construction. |

## Envelope encryption

`createEnvelopeEncryption` puts real cryptography on the existing `serialization` seam, KMS-shaped:

```ts
import { createEngine, createEnvelopeEncryption, localKeyProvider } from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';
import { anthropic } from '@rulvar/anthropic';

const enc = await createEnvelopeEncryption({
  provider: localKeyProvider({ secret: process.env.RULVAR_MASTER_SECRET ?? '' }),
});

const store = new SqliteStore({ path: './runs.db' });
const engine = createEngine({
  adapters: [anthropic()],
  stores: { journal: store, transcripts: store.transcripts() },
  serialization: enc.hook,
});
```

Under the hook, every persisted byte a run produces is AES-256-GCM ciphertext: journal payloads, transcript blobs, checkpoints. Grep the raw store and the PII is gone; read through `engine.stores` and you get plaintext, because the wrapped stores are the one policy point every reader passes. Resume, replay, recovery, and the CLI all read through the engine, so they never notice the encryption at all.

The mechanics, exactly as cloud KMS services frame the envelope pattern:

- **`DataKeyProvider` is the KMS seam.** Its two methods are the shape of KMS `GenerateDataKey` and `Decrypt`; both are called only inside `createEnvelopeEncryption`, never per entry, so the synchronous hook runs on in-memory data keys and the read path needs no live KMS. An AWS provider is a direct mapping:

```ts
import type { DataKeyProvider } from '@rulvar/core';

function kmsKeyProvider(kms: {
  generateDataKey(input: { KeyId: string; KeySpec: string }): Promise<{ Plaintext?: Uint8Array; CiphertextBlob?: Uint8Array }>;
  decrypt(input: { CiphertextBlob: Uint8Array }): Promise<{ Plaintext?: Uint8Array }>;
}, keyArn: string): DataKeyProvider {
  return {
    keyId: keyArn,
    async generateDataKey() {
      const out = await kms.generateDataKey({ KeyId: keyArn, KeySpec: 'AES_256' });
      return { plaintext: out.Plaintext ?? new Uint8Array(), wrapped: out.CiphertextBlob ?? new Uint8Array() };
    },
    async unwrapDataKey(wrapped) {
      const out = await kms.decrypt({ CiphertextBlob: wrapped });
      return out.Plaintext ?? new Uint8Array();
    },
  };
}
```

- **Tenant-scoped keys** are providers: `localKeyProvider({ secret, info: tenantId, keyId: `local:${tenantId}` })` partitions one master secret into unrelated key-encryption keys per tenant (a provider with different `info` cannot unwrap another tenant's keys, and the tests pin that), and with real KMS you pass a per-tenant key ARN. One engine per tenant, one provider per engine, exactly like the [quota limiter's tenant dimension](/guide/model-routing#shared-provider-quotas-across-processes).
- **Every envelope carries its wrapped data key**, so nothing but the provider registration is needed to read old data. Rotation is operational, not cryptographic bookkeeping: new sessions mint fresh data keys; readers of older history pass those sessions' wrapped keys as `historicalWrappedKeys` (each is unwrapped once at creation). An envelope carrying an unregistered key fails typed, naming the fix.
- **Identity is associated data.** Journal ciphertexts authenticate over the entry's `seq` and `key`, blob ciphertexts over their ref: a ciphertext moved between entries or refs fails authentication instead of decrypting into the wrong place.
- **What stays plaintext**: the kernel ordering and identity fields the hook contract pins (`seq`, `key`, `kind`, `status`, and friends), plus `spanId` and the timestamps, because stores index them and operators read them; none carry payload content. Run **meta** (name, tags, status) is deliberately not hooked either: it is the queryable operational index, so keep PII out of run names and tags, and see [the salted digest](#salted-metadata-digests) for the derived-metadata leak.
- **Reads of non-enveloped data fail closed** by default. A store with pre-encryption history reads through `plaintextReads: 'passthrough'` as an explicit migration mode; to converge, [export and re-import](#portable-export-and-import) the old runs through an encrypting engine.

## Redaction patterns at the telemetry boundary

Events already mask credential-shaped strings by default (`redaction.maskEvents`, on since M8). RV-217 adds the host policy on top: your own PII patterns, compiled once, applied to every string in every emitted event body.

```ts
const engine = createEngine({
  adapters: [anthropic()],
  redaction: {
    patterns: [
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, // emails
      /\b\d{3}-\d{2}-\d{4}\b/,                          // SSN-shaped
    ],
  },
});
```

An invalid pattern is a typed `ConfigError` at `createEngine`, before anything runs under the policy. Feed the same list to the OTel exporter for trace parity (`toOtel(run, tracer, { patterns })`), which applies it to every exported string attribute on top of the default set. The journal is never redacted: masking is for the lossy telemetry boundary, encryption for the lossless persistence one.

## Portable export and import

`engine.exportRun(runId)` produces the whole run as one portable bundle (the meta record, every journal entry, every transcript blob), read through `engine.stores`, so an encrypted deployment exports **plaintext**: a subject-access request is one call, not raw store spelunking. `engine.importRun(bundle)` writes the bundle through the target engine's stores, so an encrypting target re-encrypts under its own policy; together they are the store migration and key-rotation-by-rewrite path. Imports keep the original runId (transcript refs embed it), refuse typed when the run already exists, and a migrated run resumes on the target with zero live calls. Deletion was already first-class: `engine.deleteRun` cascades blobs then journal, and `engine.pruneRun` trims ok-terminal checkpoints; retention policy lives with the host, and the [queue worker](/guide/cli) drives both under leases.

## Salted metadata digests

`RunMeta.argsHash` binds resumes to genesis args. It is deliberately deterministic, which also makes it correlating: equal args produce equal digests across unrelated deployments, and low-entropy args (a flag, a role, a short id) are recoverable by hashing candidates. `security.argsHashSalt` switches the digest to HMAC-SHA256 under a deployment salt:

```ts
const engine = createEngine({
  adapters: [anthropic()],
  security: { argsHashSalt: process.env.RULVAR_ARGS_SALT ?? '' },
});
```

Within the deployment nothing changes (the resume args gate still verifies); across deployments the correlation breaks. The salt is deployment config: every engine and CLI host config resuming the same store must carry the same value, and runs recorded before the salt keep their unsalted digests (the gate then mismatches until forced, so introduce the salt on a fresh store or accept `--allow-args-change` on legacy runs). The CLI picks the salt up from `engineOptions.security` automatically.

## The audit trail

The journal has always been the audit log; `reduceAuditTrail(entries)` is its first-class reader: a pure fold of one run's entries into the reviewable sequence of authority events, in order. Approvals and external suspensions (with deadlines), who resolved them and how (`by: 'external' | 'operator' | 'timeout' | ...`, with the resolved value), abandons with their authorizing decision and reason, engine decisions (escalation verdicts, acceptance, admission, fallbacks), termination denials, and every run settle.

```ts
import { reduceAuditTrail } from '@rulvar/core';

const trail = reduceAuditTrail(await engine.stores.journal.load(runId));
for (const record of trail) {
  console.log(record.seq, record.at, record.category, record.summary);
}
```

Feed it entries read through `engine.stores` (or `exportRun(runId).entries`), so an encrypted deployment audits plaintext through the one policy point. The reducer is tolerant across journal vintages: unknown kinds and malformed payloads are skipped, never thrown on.

## Next steps

- [Stores](/guide/stores): the serialization hook contract the encryption rides on.
- [Durability](/guide/durability): what resume and replay require of persisted bytes.
- [Observability](/guide/observability): the event stream the redaction policy protects.
