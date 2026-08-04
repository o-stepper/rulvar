[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / pilotAgentProfile

# Function: pilotAgentProfile()

```ts
function pilotAgentProfile(options): Promise<PilotAgentProfileResult>;
```

Defined in: `packages/core/dist/index.d.ts`

The read-only pilot preset (RV1606): the
[production profiles guide](https://docs.rulvar.com/guide/production-profiles)'s
controlled-pilot posture as ONE shipped factory instead of a page of
assembly. Builds on [researchAgentProfile](/api/@rulvar/rulvar/functions/researchAgentProfile.md) (the confined
read-only repository toolset, evidence recording, progress contract,
stop conditions) and adds the fail-closed session posture the
eighteenth comparison benchmark's improvement plan asked to ship:

- the resolved toolset is ATTESTED (`toolsetAttestation`, RV1514):
  any drift between this factory's toolset and what the spawn
  resolves refuses typed, pre-wire, naming the changed tools;
- permissions hard-deny every risk class except declared reads
  (`write`, `network`, `execute`, `destructive`, and `undeclared`
  all match one deny rule), `strictApprovals` is armed so a generic
  allow can never clear a `needsApproval` tool, and
  `inheritPermissions` stays false;
- isolation is `'none'`: a read-only child needs no worktree, and
  the profile never implies one.

What it deliberately does NOT claim: the deny rules govern TOOL
dispatch, not the process (a subprocess or worktree is an isolation
convenience, never a security boundary; SECURITY.md), and no merge,
deploy, or effect authority exists here to withhold. Async because
the attestation pins the RESOLVED toolset.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md) |

## Returns

`Promise`\&lt;[`PilotAgentProfileResult`](/api/@rulvar/rulvar/interfaces/PilotAgentProfileResult.md)\&gt;
