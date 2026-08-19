/**
 * The construction-side posture attestation (RV4101; the debt RV4009
 * named). The regulated floor binds what flows through
 * CreateEngineOptions / RunOptions / OrchestrateOptions, but the
 * postures that decide whether a tool list can drift under a run or
 * whether a provider executes tools outside the permission chain live
 * on CONSTRUCTIONS: the mcp() source and the AI SDK bridge adapter.
 * RV4009 deliberately excluded them from the profile hash ("a hash
 * must not imply what it cannot verify") and named them in prose
 * beside the call. This descriptor makes them verifiable: a
 * risk-bearing construction exposes `describeRegulatedPosture()`, a
 * PURE snapshot of what was chosen at construction time (no wire, no
 * connect, no side effects), and `compileRegulatedProfile` walks the
 * constructions reachable from its options, refuses a loosened
 * posture naming the field, and folds the sorted descriptors into the
 * hashed posture map beside an `unrecognized` count of the
 * constructions that exposed nothing, so the hash names its own blind
 * spot instead of implying totality.
 *
 * The window this deliberately leaves open: a construction mutated
 * AFTER compile time. The descriptor is a snapshot, not a lease;
 * closing that window is the RV1608 template applied at first use,
 * and is its own train.
 */

/** The posture an mcp() tool source chose at construction (RV1516/RV1808). */
export interface McpSourceRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: 'mcp-source';
  /** The source id (`mcp:stdio:<command>`, `mcp:http:<url>`, `mcp:inprocess`). */
  name: string;
  /** What a listChanged notification means for this source (RV1516). */
  drift: 'rekey' | 'refuse';
  /**
   * The discovery bounds (RV1808); `declared` is the all-four
   * predicate `requireBounds` enforces (maxTools, maxPages,
   * maxSchemaBytes, timeouts.discoveryMs), and the declared values
   * ride beside it so the profile hash moves when a bound moves.
   */
  bounds: {
    declared: boolean;
    maxTools?: number;
    maxPages?: number;
    maxSchemaBytes?: number;
    discoveryMs?: number;
  };
}

/** The posture a bridgeAiSdk() adapter chose at construction. */
export interface AiSdkBridgeRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: 'ai-sdk-bridge';
  /** The adapter id. */
  name: string;
  /**
   * Whether provider-executed tool results are admitted past the
   * seam; 'allow' runs tools outside the permission chain and the
   * journal, which the regulated floor refuses.
   */
  providerExecutedTools: 'allow' | 'deny';
}

/** What `describeRegulatedPosture()` returns: one of the known shapes. */
export type RegulatedPostureDescriptor = McpSourceRegulatedPosture | AiSdkBridgeRegulatedPosture;
