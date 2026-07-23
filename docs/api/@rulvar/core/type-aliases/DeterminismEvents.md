[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DeterminismEvents

# Type Alias: DeterminismEvents

```ts
type DeterminismEvents = {
  category: "bare-date-now" | "bare-math-random";
  column?: number;
  file?: string;
  frame: string;
  line?: number;
  provenance: "workflow" | "allowlisted";
  type: "determinism:warning";
};
```

Defined in: [packages/core/src/l0/events.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L205)

Bare-nondeterminism detection (RV-209). Emitted LIVE by the segment
that observed the call, at most once per (category, provenance) per
execution segment; never journaled and never re-emitted with the
`replayed` flag. Because replay re-executes the workflow body, a
violation that survives in the code fires again on every replay of
the run, so the event appears organically in both live and replayed
streams. Exempt provenances (installed dependencies under
node_modules and Node runtime frames) never emit: they are
classified and silenced, which is what keeps an SDK's internal
`Math.random()` from branding the run nondeterministic.

## Properties

### category

```ts
category: "bare-date-now" | "bare-math-random";
```

Defined in: [packages/core/src/l0/events.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L208)

Which patched global fired.

***

### column?

```ts
optional column?: number;
```

Defined in: [packages/core/src/l0/events.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L222)

***

### file?

```ts
optional file?: string;
```

Defined in: [packages/core/src/l0/events.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L220)

Parsed location when the frame carries one, after redaction.

***

### frame

```ts
frame: string;
```

Defined in: [packages/core/src/l0/events.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L218)

The calling stack frame, after the configured redaction hook.

***

### line?

```ts
optional line?: number;
```

Defined in: [packages/core/src/l0/events.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L221)

***

### provenance

```ts
provenance: "workflow" | "allowlisted";
```

Defined in: [packages/core/src/l0/events.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L216)

'workflow': the caller is workflow-origin code (the violation the
guard exists for; rejects the run under `determinism.mode:
'error'`). 'allowlisted': the caller matched a configured
`determinism.allowlist` pattern and is exempt by explicit host
decision; emitted for visibility, never rejects.

***

### type

```ts
type: "determinism:warning";
```

Defined in: [packages/core/src/l0/events.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L206)
