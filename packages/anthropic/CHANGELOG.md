# @rulvar/anthropic

## 1.242.0

### Patch Changes

- Updated dependencies [6e3438e]
- Updated dependencies [ba5cf67]
- Updated dependencies [c2d1531]
  - @rulvar/core@1.242.0

## 1.241.0

### Patch Changes

- Updated dependencies [dbcdd24]
- Updated dependencies [7ae7243]
- Updated dependencies [4f832c4]
- Updated dependencies [7452d3d]
- Updated dependencies [a4e22bf]
- Updated dependencies [82df4af]
  - @rulvar/core@1.241.0

## 1.240.0

### Patch Changes

- @rulvar/core@1.240.0

## 1.239.0

### Patch Changes

- Updated dependencies [74ce99a]
- Updated dependencies [ccd0665]
- Updated dependencies [0c5ce21]
- Updated dependencies [0616934]
  - @rulvar/core@1.239.0

## 1.238.0

### Patch Changes

- Updated dependencies [cf00947]
- Updated dependencies [c7b9382]
- Updated dependencies [88aea96]
- Updated dependencies [6da8d05]
- Updated dependencies [eae5c4c]
  - @rulvar/core@1.238.0

## 1.237.0

### Minor Changes

- 3b987a1: Anthropic model resolution adopts the dated snapshot grammar (RV3303), the posture openai took in the v1.17.0 review P1-1. The old matcher let ANY suffix of a known name inherit the full table row, so an unseen variant like `claude-sonnet-5-preview` silently took the known model's caps and its promotional pricing, exactly the fabricated row the table's unknown model contract forbids; the 2026-08-12 comparison run named this counterexample. Now only the exact name or `<exact model>-YYYYMMDD` resolves a row; every other suffix falls through to the conservative unpriced caps, surfaces in `CostReport.unpriced`, and trips the ceiling warning instead of pricing as its neighbor. Dated snapshots of known names (`claude-haiku-4-5-20251001`) resolve byte identically to before.

### Patch Changes

- Updated dependencies [9d6a279]
- Updated dependencies [49a98f6]
- Updated dependencies [a734ca0]
- Updated dependencies [deb406f]
  - @rulvar/core@1.237.0

## 1.236.0

### Patch Changes

- Updated dependencies [26306ea]
- Updated dependencies [709b942]
  - @rulvar/core@1.236.0

## 1.235.0

### Patch Changes

- Updated dependencies [ba4e10d]
- Updated dependencies [172402b]
- Updated dependencies [2ecd787]
- Updated dependencies [e20a5e9]
- Updated dependencies [98c8691]
- Updated dependencies [c70def0]
  - @rulvar/core@1.235.0

## 1.234.0

### Patch Changes

- Updated dependencies [8420c04]
  - @rulvar/core@1.234.0

## 1.233.0

### Patch Changes

- Updated dependencies [48b5200]
- Updated dependencies [73bc32b]
- Updated dependencies [e63b743]
- Updated dependencies [ef45da7]
  - @rulvar/core@1.233.0

## 1.232.0

### Minor Changes

- 6a58120: Bounded `refreshCaps()` pagination (RV2904). The ninth comparison run's adversarial audit found `models.list` the one pagination in the tree the MCP cycle doctrine (RV1602/RV1808) had not reached: a server echoing or recycling `last_id` spun the sweep forever, comfortably inside every timeout. A cursor echoed back or re-used by the sweep is now refused unconditionally as a typed cycle, and the new opt-in `capsMaxPages` fails the refresh typed when more pages are still reported past the bound, in the fail-closed maxTools direction: truncating would clamp output bounds against a silently partial caps table.

### Patch Changes

- Updated dependencies [1440410]
- Updated dependencies [6e467f4]
- Updated dependencies [0b14293]
- Updated dependencies [e3bcab2]
- Updated dependencies [b55a0f7]
  - @rulvar/core@1.232.0

## 1.231.0

### Patch Changes

- Updated dependencies [4eb4b56]
- Updated dependencies [bc8f09e]
- Updated dependencies [ff9b8c2]
  - @rulvar/core@1.231.0

## 1.230.0

### Patch Changes

- Updated dependencies [e9bf910]
- Updated dependencies [57bfb38]
  - @rulvar/core@1.230.0

## 1.229.0

### Patch Changes

- Updated dependencies [3370342]
- Updated dependencies [2fb6656]
- Updated dependencies [edce170]
  - @rulvar/core@1.229.0

## 1.228.0

### Patch Changes

- Updated dependencies [4034fac]
- Updated dependencies [a54b085]
- Updated dependencies [9d0a9be]
- Updated dependencies [be9ef28]
  - @rulvar/core@1.228.0

## 1.227.0

### Patch Changes

- Updated dependencies [f262e9f]
- Updated dependencies [f191ff7]
- Updated dependencies [fbbfbe8]
- Updated dependencies [263b5e8]
- Updated dependencies [db4d56d]
- Updated dependencies [41f93a9]
- Updated dependencies [98c8ca9]
  - @rulvar/core@1.227.0

## 1.226.0

### Patch Changes

- @rulvar/core@1.226.0

## 1.225.0

### Patch Changes

- @rulvar/core@1.225.0

## 1.224.0

### Patch Changes

- Updated dependencies [4eca1a3]
  - @rulvar/core@1.224.0

## 1.223.0

### Patch Changes

- Updated dependencies [549aabd]
- Updated dependencies [549aabd]
  - @rulvar/core@1.223.0

## 1.222.0

### Patch Changes

- Updated dependencies [8326268]
  - @rulvar/core@1.222.0

## 1.221.0

### Patch Changes

- Updated dependencies [032ce93]
  - @rulvar/core@1.221.0

## 1.220.0

### Patch Changes

- Updated dependencies [0babe70]
  - @rulvar/core@1.220.0

## 1.219.0

### Patch Changes

- Updated dependencies [65a4ce7]
  - @rulvar/core@1.219.0

## 1.218.0

### Patch Changes

- Updated dependencies [088bda6]
  - @rulvar/core@1.218.0

## 1.217.0

### Patch Changes

- Updated dependencies [ab80b97]
  - @rulvar/core@1.217.0

## 1.216.0

### Patch Changes

- Updated dependencies [b357f4a]
  - @rulvar/core@1.216.0

## 1.215.0

### Patch Changes

- Updated dependencies [e1da4c7]
  - @rulvar/core@1.215.0

## 1.214.0

### Patch Changes

- Updated dependencies [c8af0ec]
  - @rulvar/core@1.214.0

## 1.213.0

### Patch Changes

- Updated dependencies [61680df]
  - @rulvar/core@1.213.0

## 1.212.0

### Patch Changes

- Updated dependencies [e6f8516]
  - @rulvar/core@1.212.0

## 1.211.0

### Patch Changes

- Updated dependencies [d5a8a36]
  - @rulvar/core@1.211.0

## 1.210.0

### Patch Changes

- Updated dependencies [c871ddc]
  - @rulvar/core@1.210.0

## 1.209.0

### Patch Changes

- Updated dependencies [514c7bb]
  - @rulvar/core@1.209.0

## 1.208.0

### Minor Changes

- e7d426f: First-class prompt-cache policy (RV2006). `ChatRequest.cacheHint` existed and the Anthropic adapter compiled it into `cache_control`, but nothing in the core ever populated it: the third parity rerun's workers re-paid the full input rate on every turn of their ~550k-token contexts (`cacheReadTokens 0` across the run), and the $6 envelope sized on OpenAI's implicit server cache was incomparable on Anthropic. The agent loop now compiles the hint on every tool-cycle turn: breakpoints after tools, after system, and after the deepest message, sliding with the history. Default ON exactly where the adapter declares the new `ModelCaps.promptCaching: 'explicit'` (the Anthropic adapter does); OpenAI declares `'implicit'` and undeclared adapters get byte-identical requests. Configure with `defaults.cache`, `AgentProfile.cache`, or per-call `opts.cache` (`CachePolicy { mode?: 'auto' | 'off'; ttl?: '5m' | '1h' }`), call over profile over engine. Billing note: on cache-capable Anthropic models this changes the wire requests of every loop turn to carry cache breakpoints, typically cutting long-cycle input cost several-fold (cached reads bill at a tenth of the input rate); `CostReport` cache accounting is unchanged, the hint never enters identity or journals, and `@rulvar/testing`'s `requestHash` strips it so existing cassettes replay byte for byte.

### Patch Changes

- Updated dependencies [e7d426f]
  - @rulvar/core@1.208.0

## 1.207.0

### Patch Changes

- Updated dependencies [99beee2]
  - @rulvar/core@1.207.0

## 1.206.0

### Patch Changes

- Updated dependencies [ec8e1f1]
  - @rulvar/core@1.206.0

## 1.205.0

### Patch Changes

- Updated dependencies [6d224da]
  - @rulvar/core@1.205.0

## 1.204.0

### Patch Changes

- Updated dependencies [efaec9b]
  - @rulvar/core@1.204.0

## 1.203.0

### Patch Changes

- Updated dependencies [fb08c10]
  - @rulvar/core@1.203.0

## 1.202.0

### Patch Changes

- @rulvar/core@1.202.0

## 1.201.0

### Patch Changes

- Updated dependencies [7e01189]
  - @rulvar/core@1.201.0

## 1.200.0

### Patch Changes

- Updated dependencies [e2ddbdf]
  - @rulvar/core@1.200.0

## 1.199.0

### Patch Changes

- Updated dependencies [29891c6]
  - @rulvar/core@1.199.0

## 1.198.0

### Patch Changes

- Updated dependencies [c097c96]
  - @rulvar/core@1.198.0

## 1.197.0

### Patch Changes

- @rulvar/core@1.197.0

## 1.196.0

### Patch Changes

- Updated dependencies [ec9c3e3]
  - @rulvar/core@1.196.0

## 1.195.0

### Patch Changes

- Updated dependencies [5702a70]
  - @rulvar/core@1.195.0

## 1.194.0

### Patch Changes

- Updated dependencies [360a659]
  - @rulvar/core@1.194.0

## 1.193.0

### Patch Changes

- Updated dependencies [2bca1d1]
  - @rulvar/core@1.193.0

## 1.192.0

### Patch Changes

- Updated dependencies [8757601]
  - @rulvar/core@1.192.0

## 1.191.0

### Patch Changes

- Updated dependencies [745387c]
  - @rulvar/core@1.191.0

## 1.190.0

### Patch Changes

- Updated dependencies [8e02021]
  - @rulvar/core@1.190.0

## 1.189.0

### Patch Changes

- Updated dependencies [6a5cc2d]
  - @rulvar/core@1.189.0

## 1.188.0

### Patch Changes

- @rulvar/core@1.188.0

## 1.187.0

### Minor Changes

- c9798ef: The absorbed pause_turn wire set survives the error arms (RV1805). The Anthropic adapter published the whole segment set (`wireRequests = { count, responseIds }`) only on the successful terminal finish, so an error after absorbed continuations, a `create()` failure, a truncated read, the continuation cap, or a pre-wire segment denial, yielded bare and orphaned exactly the paid wires a per-request statement join needs most (the segments' usage already survives through mid-stream reports; the ids and the count did not). Every error arm now rides the COMPLETED absorbed segments' wire set on its error data, the agent loop's provider call record reads it when the finish that would have named the set never came (a single absorbed segment included, since an errored dispatch has no plain responseId to join by), the invoice row keeps the ids and the count, and a first-segment failure stays a bare error with nothing invented.

### Patch Changes

- Updated dependencies [c9798ef]
  - @rulvar/core@1.187.0

## 1.186.0

### Patch Changes

- Updated dependencies [242647e]
  - @rulvar/core@1.186.0

## 1.185.0

### Patch Changes

- Updated dependencies [1248623]
  - @rulvar/core@1.185.0

## 1.184.0

### Patch Changes

- Updated dependencies [8a9caca]
  - @rulvar/core@1.184.0

## 1.183.0

### Patch Changes

- Updated dependencies [dd3767c]
  - @rulvar/core@1.183.0

## 1.182.0

### Patch Changes

- Updated dependencies [144d026]
  - @rulvar/core@1.182.0

## 1.181.0

### Patch Changes

- @rulvar/core@1.181.0

## 1.180.0

### Patch Changes

- Updated dependencies [b124d26]
  - @rulvar/core@1.180.0

## 1.179.0

### Patch Changes

- Updated dependencies [1a5a85a]
  - @rulvar/core@1.179.0

## 1.178.0

### Patch Changes

- @rulvar/core@1.178.0

## 1.177.0

### Patch Changes

- Updated dependencies [94db8ff]
  - @rulvar/core@1.177.0

## 1.176.0

### Patch Changes

- Updated dependencies [a74304d]
  - @rulvar/core@1.176.0

## 1.175.0

### Patch Changes

- Updated dependencies [1999c5d]
  - @rulvar/core@1.175.0

## 1.174.0

### Patch Changes

- Updated dependencies [aa9a772]
  - @rulvar/core@1.174.0

## 1.173.0

### Patch Changes

- Updated dependencies [67d27ac]
  - @rulvar/core@1.173.0

## 1.172.0

### Patch Changes

- Updated dependencies [0d4770b]
  - @rulvar/core@1.172.0

## 1.171.0

### Patch Changes

- Updated dependencies [f6116b9]
  - @rulvar/core@1.171.0

## 1.170.0

### Patch Changes

- Updated dependencies [86e4c06]
  - @rulvar/core@1.170.0

## 1.169.0

### Patch Changes

- Updated dependencies [623b2ae]
  - @rulvar/core@1.169.0

## 1.168.0

### Patch Changes

- Updated dependencies [ebba79a]
  - @rulvar/core@1.168.0

## 1.167.0

### Patch Changes

- @rulvar/core@1.167.0

## 1.166.0

### Patch Changes

- Updated dependencies [d8262c3]
  - @rulvar/core@1.166.0

## 1.165.0

### Patch Changes

- Updated dependencies [6391274]
  - @rulvar/core@1.165.0

## 1.164.0

### Patch Changes

- Updated dependencies [9f2dda9]
  - @rulvar/core@1.164.0

## 1.163.0

### Patch Changes

- Updated dependencies [e8d9ada]
  - @rulvar/core@1.163.0

## 1.162.0

### Patch Changes

- Updated dependencies [2031e82]
  - @rulvar/core@1.162.0

## 1.161.0

### Patch Changes

- Updated dependencies [d4547b7]
  - @rulvar/core@1.161.0

## 1.160.0

### Patch Changes

- Updated dependencies [1c6f0d0]
  - @rulvar/core@1.160.0

## 1.159.0

### Patch Changes

- Updated dependencies [e881c8b]
  - @rulvar/core@1.159.0

## 1.158.0

### Patch Changes

- Updated dependencies [a266bc7]
  - @rulvar/core@1.158.0

## 1.157.0

### Patch Changes

- Updated dependencies [1883421]
  - @rulvar/core@1.157.0

## 1.156.0

### Patch Changes

- Updated dependencies [537144e]
  - @rulvar/core@1.156.0

## 1.155.0

### Patch Changes

- Updated dependencies [49b08a7]
  - @rulvar/core@1.155.0

## 1.154.0

### Patch Changes

- Updated dependencies [9259f24]
  - @rulvar/core@1.154.0

## 1.153.0

### Patch Changes

- Updated dependencies [d8bebcb]
  - @rulvar/core@1.153.0

## 1.152.0

### Patch Changes

- Updated dependencies [dd6a616]
  - @rulvar/core@1.152.0

## 1.151.0

### Patch Changes

- Updated dependencies [1de0610]
  - @rulvar/core@1.151.0

## 1.150.0

### Patch Changes

- Updated dependencies [a331211]
  - @rulvar/core@1.150.0

## 1.149.0

### Patch Changes

- Updated dependencies [08b4537]
  - @rulvar/core@1.149.0

## 1.148.0

### Patch Changes

- Updated dependencies [c85dac9]
  - @rulvar/core@1.148.0

## 1.147.0

### Patch Changes

- Updated dependencies [6367231]
  - @rulvar/core@1.147.0

## 1.146.0

### Patch Changes

- Updated dependencies [5d9bbc8]
  - @rulvar/core@1.146.0

## 1.145.0

### Patch Changes

- @rulvar/core@1.145.0

## 1.144.0

### Patch Changes

- Updated dependencies [c11bcd6]
  - @rulvar/core@1.144.0

## 1.143.0

### Patch Changes

- Updated dependencies [f412169]
  - @rulvar/core@1.143.0

## 1.142.0

### Patch Changes

- @rulvar/core@1.142.0

## 1.141.0

### Patch Changes

- Updated dependencies [4f12a62]
  - @rulvar/core@1.141.0

## 1.140.0

### Patch Changes

- @rulvar/core@1.140.0

## 1.139.0

### Patch Changes

- Updated dependencies [03a2141]
  - @rulvar/core@1.139.0

## 1.138.0

### Minor Changes

- ed0c4fb: Pre-wire continuation reservation, the self-describing fault kit, and the run-id surface (RV1013 + RV1014, PR VII closing the fourteenth plan)

  - Pre-wire continuation admission (RV1013, opt-in). Post-hoc settlement is accounting, not admission: a hard provider RPM cap needs each `pause_turn` continuation reserved BEFORE its egress. With `quota: { reserveContinuations: true }` the engine admits every provider-side continuation through the new adapter-side `StreamHooks` seam (`ProviderAdapter.stream` gains an optional third parameter; the Anthropic adapter honors it): under a 2-request window the third wire of one absorbed dispatch never leaves and the denial rides the provider-429 machinery verbatim, the main settlement stops re-adding individually admitted segments (the window is never double-counted), and a granted admission whose wire never left is RELEASED back to the window through the new optional `QuotaLimiter.release(reservationId)` (implemented by `memoryQuotaLimiter`; a release returns exactly what admission consumed, and unknown or expired ids are no-ops). Adapters unaware of the hook keep the documented post-hoc semantics byte for byte, and the default stays post-hoc. The midstream-versus-finish usage confirmation now fires only when a finish CLAIM exists: an error-terminal absorption (a segment denial, a transport cut) no longer manufactures an invariant violation that shadows the real wire error.
  - The self-describing kit (RV1014). `runFaultInjection` refuses an empty `only` selection typed (a gate that runs zero scenarios used to report `allMatched: true`), and the report carries `requested` and `selected` counts so the gate can never quietly shrink. The audit scenario grows the RV1007 arcs (a page-only long-context tier and a `NaN` scalar are findings, never silent passes), completing kit coverage of every real defect of the fourteenth plan on its real path.
  - The run-id boundary surface (`assertSafeRunId`, `MAX_RUN_ID_LENGTH`) is now exported from `@rulvar/core`, so hosts can pre-validate ids before `engine.run`.

### Patch Changes

- Updated dependencies [ed0c4fb]
  - @rulvar/core@1.138.0

## 1.137.0

### Patch Changes

- Updated dependencies [96f6788]
  - @rulvar/core@1.137.0

## 1.136.0

### Patch Changes

- Updated dependencies [aa6ca71]
  - @rulvar/core@1.136.0

## 1.135.0

### Patch Changes

- Updated dependencies [cf75e22]
  - @rulvar/core@1.135.0

## 1.134.0

### Patch Changes

- @rulvar/core@1.134.0

## 1.133.0

### Minor Changes

- 2659f54: A legitimate pause_turn survives the engine end to end, and an invalid continuation cap refuses typed before the first wire (RV1003 + RV1004, PR II of the fourteenth plan)

  The fourteenth comparison experiment drove the real Anthropic adapter through the real engine and a legitimate two-segment `pause_turn` killed the run: every segment's `message_start` emitted its own usage mid-stream (5 then 6), the terminal finish carried only the LAST segment's counts, and the engine's midstream-versus-finish invariant read 11 > 6, losing the paid segments from the money. The same experiment fed `pauseTurnMaxContinuations: NaN` and the cap silently disarmed (`continuations > NaN` is always false), turning every further continuation into unplanned paid traffic.

  - The terminal finish now speaks for the WHOLE logical turn (RV1003): the adapter accumulates each absorbed segment's normalized usage (`sumUsage`, cache counts and the TTL split included) and the finish carries the sum, so the invariant confirms the per-segment mid-stream reports, the per-call record and the invoice price every paid segment, and the quota window still settles at true wire units. Mid-stream events stay per-segment deltas; a single-segment turn stays byte-identical. `TurnMapping` gains the segment's own `usage`.
  - `pauseTurnMaxContinuations` must be a nonnegative safe integer (RV1004): any other present value (NaN, Infinity, negatives, fractions, strings) refuses with a typed `ConfigError` before the first wire, instead of silently disarming the continuation bound.
  - `runFaultInjection` (`@rulvar/evals`) grows the seventeenth scenario, `pause-turn-real-adapter`: the two-segment absorption through the REAL adapter and engine must settle `ok` at usage 11/2 with both wire ids on the invoice row and the quota window at 2, and the NaN cap must refuse before any wire. Reverting either fix reports `matched: false` in the kit.

### Patch Changes

- @rulvar/core@1.133.0

## 1.132.0

### Patch Changes

- Updated dependencies [2bec904]
  - @rulvar/core@1.132.0

## 1.131.0

### Patch Changes

- Updated dependencies [256cae1]
  - @rulvar/core@1.131.0

## 1.130.0

### Patch Changes

- Updated dependencies [d6bec7a]
  - @rulvar/core@1.130.0

## 1.129.0

### Patch Changes

- Updated dependencies [1612439]
  - @rulvar/core@1.129.0

## 1.128.0

### Minor Changes

- 27c4e38: pause_turn continuations become accounted wire units (RV905, the thirteenth experiment's fifth release risk). The Anthropic adapter absorbs server-side turn pauses by re-sending, making up to six wire requests inside ONE core dispatch; until now the request quota window, the provider call record, and the invoice row all saw one, and a per-request provider statement matched one segment while the rest read statement-only.

  The adapter's finish metadata now names the whole segment set (`providerMetadata.anthropic.wireRequests = { count, responseIds }`); the provider call record and the invoice row carry `wireResponseIds`; and the quota reconciliation settles the reservation against the TRUE wire request count. The `QuotaLimiter.reconcile` SPI gains an optional `actual.requests` argument, honored by all three reference limiters through one shared arithmetic (`quotaActualRequestsDelta`), so a window that admitted one request per reservation now reflects what the provider's own RPM meter saw; a settlement only ever adds, never denies retroactively, and implementations written against the two-argument form remain valid. `reconcileStatement` joins a multi-wire invoice row by ANY id of its segment set, all-or-nothing: a partially delivered segment set reads `partial-coverage` with its delivered segments never counted as statement-only (and never `no-overlap` when segments touched our data), and provider-reported token counts compare as the SUM over the segments against the dispatch's recorded usage. Single-wire dispatches carry none of the new fields and stay byte-identical, journals and events included.

### Patch Changes

- Updated dependencies [27c4e38]
  - @rulvar/core@1.128.0

## 1.127.0

### Minor Changes

- b3b1805: Admission before egress for the pre-dispatch token count (RV904, the thirteenth experiment's pre-admission egress probe). ctx.agent calls the adapter's optional `countTokens` with the FULL child prompt to tighten the admission reserve; before this release that network call ran before the budget decided anything, so a spawn the budget could never admit still sent the prompt to the provider, the call honored no abort signal, and nothing observable recorded the egress.

  The reserve is monotone in the count, so the smallest reserve any count outcome could produce is computable without it: the priced floor at zero input tokens, or the flat fallback the count-failed path admits under. The engine now checks that floor against the budget first, through the exact refusal arithmetic `admitSpawn` itself uses (`RunBudget.refuseSpawnIfInfeasible`, the refusal arm factored out so the two layers can never disagree), and a spawn that could never be admitted (the lifetime spawn cap, a full account, an exhausted ceiling) refuses with zero network calls. The provider SPI's `countTokens` gains an options argument with an `AbortSignal`; the Anthropic adapter threads it into the SDK request, and an abort mid-count cancels the spawn instead of silently falling back to the flat reserve and dispatching behind a cancelled spawn. Every count is now observable: an `admission.countTokens` info log names the model and the counted tokens, and a failed count warns with the failure the flat reserve then covers. An explicit `estCost` (per call or per profile) remains the zero-egress path that skips the count entirely, now documented as the posture for hosts whose privacy gates must run before any prompt byte reaches a provider. Spawns on adapters without `countTokens`, and spawns carrying `estCost`, behave byte-identically to v1.126.0.

### Patch Changes

- Updated dependencies [b3b1805]
  - @rulvar/core@1.127.0

## 1.126.0

### Patch Changes

- @rulvar/core@1.126.0

## 1.125.0

### Minor Changes

- 109e9fa: Pricing-table truth: the Anthropic 1h cache-write premium is seeded, the rates audit fails closed on documented rates the seed never declared, and the OpenAI Terra/Luna price cut ships as a versioned revision (RV901, RV902, RV911; the thirteenth experiment's underpricing probes).

  `@rulvar/anthropic` seeds now carry all five published pricing columns: `cacheWrite1hUsdPerMTok` lands on every priced row at the documented 2x base input (Fable 5 $20, Opus 4.8/4.7/4.6 $10, Sonnet 5 $4 under the introductory price, Sonnet 4.6 $6, Haiku 4.5 $2), under the new `pricingVersion` `anthropic-2026-07-31`. v1.124.0 taught the wire to fill the canonical 5m/1h split and `priceUsdOf` to bill the 1h share at the premium, but the seed never declared the rate, so a million Sonnet 5 1h write tokens priced at the 5m $2.50 instead of the documented $4.00: an underpricing a budget ceiling then failed to bound. A usage with no split still folds the whole write count at the 5m rate, byte for byte as before; the stale caps comment claiming the canonical Usage cannot distinguish 1h writes is retired.

  `scripts/rates-audit.mjs` (the weekly documented-rates drift audit) now compares seed and page in BOTH directions: a billable page rate the seed never declared is a finding, not a silent skip. The old one-directional rule rested on the 1h premium being unbillable; that rationale died with the Usage split, and the audit printing `match` for Sonnet 5 while the page showed a 1h column the seed lacked is exactly how the underpricing hid. The pinning test is flipped to the fail-closed behavior.

  `@rulvar/openai` picks up the provider's 2026-07-30 price cut, docs-verified per model page on 2026-07-31 after the live audit caught the drift: Terra to $2 input / $12 output / $0.20 cached input / $2.50 cache write (0.8x across the board) and Luna to $0.20 / $1.20 / $0.02 / $0.25 (0.2x), both keeping the family's long-context tier, under the new `pricingVersion` `openai-2026-07-31`. Sol is unchanged and additionally remains billing-confirmed by the 2026-07-30 statement reconciliation; the new Terra and Luna rates are docs-verified only until the next reconciliation over a saved export. Runs recorded under `openai-2026-07-18-r2` overstated Terra/Luna spend relative to the cut, never under, and a resumed run surfaces the rotation as explicit pricing drift instead of silently reinterpreting recorded spend. Every re-verified row now stamps `ratesVerifiedAt: '2026-07-31'`.

### Patch Changes

- @rulvar/core@1.125.0

## 1.124.0

### Minor Changes

- 37fd1f2: The twelfth plan's closing trio (RV809, RV810, RV811). The tool budget extension gains `coverEvidenceDeficit`: with an evidence contract declared, the extension grants at a tool-turn boundary whenever the remaining call budget cannot cover the declared floor's outstanding deficit, under the same money, progress, and maxExtensions gates, so a limited child at 7 of 11 entries converts headroom into the missing evidence BEFORE the cap instead of dumping through the reserved tail; the journaled grant decision carries `trigger: 'evidence-deficit'` and the announcement names the exact deficit. Canonical Usage gains the optional cache-write TTL split (`cacheWrite5mTokens` and `cacheWrite1hTokens`, invariant: the split sums to `cacheWriteTokens`); `priceUsdOf` bills the 1h share at `cacheWrite1hUsdPerMTok` with everything unclaimed at the plain write rate (byte-identical arithmetic without a split), sanitize repairs broken splits with 1h priority (never an undercharge), and the Anthropic adapter fills the split from the `cache_creation` breakdown when it agrees with the flat total. @rulvar/evals gains the fault-injection kit: `runFaultInjection` drives the never-observed-live fail-closed branches (in-flight-exposure refusal, duplicate quota rule, torn and glued JSONL tails, the settle-boundary crash resume, pricing rotation with an uncovered tail, unknown provider id) on the real engine offline, verifies each documented typed observable fail closed, and leaves experiment-grade artifacts.

### Patch Changes

- Updated dependencies [37fd1f2]
  - @rulvar/core@1.124.0

## 1.123.0

### Patch Changes

- Updated dependencies [5c46468]
  - @rulvar/core@1.123.0

## 1.122.0

### Patch Changes

- Updated dependencies [8cf45c5]
  - @rulvar/core@1.122.0

## 1.121.0

### Minor Changes

- 3d67d41: Rate provenance made checkable (RV807, RV813, RV814). The pricing row grows `ratesVerifiedAt` (SPI), the ISO date it was last verified against the provider's documented rates or, stronger, its billing categories: the shipped seeds stamp it (the GPT-5.6 family reads `2026-07-30`, the day the statement reconciliation confirmed those rates against the provider's own per-component billing categories to the cent; the pre-5.6 OpenAI rows keep their `2026-07-18` docs verification; every Anthropic row was re-verified against the documented table on `2026-07-30`). The date is surfaced wherever a dollar is consumed: `preflightEstimate` copies it onto each spawn report and `rulvar preflight` renders `ratesVerified=<date>` with its age on the spawn line; the settle pin journals it with the rest of the applied row so it survives any later table rewrite; and `rulvar invoice` prints a `rates verified:` line naming each priced model's date and age, pinned rows first, current table past them; the twelfth run's founder read the invoice doubting the rates and nothing said the seed was 12 days stale. The doctrine ships with the mechanism: seeds bound ceilings conservatively, billing truth is established only by `reconcileStatement` over saved exports, and a confirmed divergence corrects the seed in its own release with a changeset, never a silent rewrite. Enforcement rides two new gates: a weekly documented-rates audit (`scripts/rates-audit.mjs` in the live contract workflow) re-fetches exactly the pages the seed comments cite, compares every rate, write premium, and long-context tier, and opens an issue on drift or on a page that stops extracting, and a README release-table gate (`scripts/readme-release-shas.mjs`, in CI) requires every cited squash SHA to be an ancestor of HEAD, catching the v1.109.0 row that pointed at an object no branch contained for eleven releases (now corrected to the real squash `58afdb5`).

### Patch Changes

- Updated dependencies [3d67d41]
  - @rulvar/core@1.121.0

## 1.120.0

### Patch Changes

- Updated dependencies [d630c9e]
  - @rulvar/core@1.120.0

## 1.119.0

### Patch Changes

- Updated dependencies [1e4ff3c]
  - @rulvar/core@1.119.0

## 1.118.0

### Patch Changes

- Updated dependencies [f8341a3]
  - @rulvar/core@1.118.0

## 1.117.0

### Patch Changes

- @rulvar/core@1.117.0

## 1.116.0

### Patch Changes

- Updated dependencies [a213878]
  - @rulvar/core@1.116.0

## 1.115.0

### Patch Changes

- Updated dependencies [63642ae]
  - @rulvar/core@1.115.0

## 1.114.0

### Patch Changes

- Updated dependencies [5759731]
  - @rulvar/core@1.114.0

## 1.113.0

### Patch Changes

- Updated dependencies [a60807a]
  - @rulvar/core@1.113.0

## 1.112.0

### Patch Changes

- Updated dependencies [00ae55b]
  - @rulvar/core@1.112.0

## 1.111.0

### Patch Changes

- Updated dependencies [fd25169]
  - @rulvar/core@1.111.0

## 1.110.0

### Patch Changes

- Updated dependencies [58afdb5]
  - @rulvar/core@1.110.0

## 1.109.0

### Patch Changes

- Updated dependencies [85b1d39]
  - @rulvar/core@1.109.0

## 1.108.0

### Patch Changes

- Updated dependencies [affa3d4]
  - @rulvar/core@1.108.0

## 1.107.0

### Patch Changes

- Updated dependencies [9f5f6f6]
  - @rulvar/core@1.107.0

## 1.106.0

### Patch Changes

- Updated dependencies [9a4ce49]
  - @rulvar/core@1.106.0

## 1.105.0

### Patch Changes

- Updated dependencies [531dc88]
  - @rulvar/core@1.105.0

## 1.104.0

### Patch Changes

- @rulvar/core@1.104.0

## 1.103.0

### Patch Changes

- Updated dependencies [f2b809e]
  - @rulvar/core@1.103.0

## 1.102.0

### Patch Changes

- Updated dependencies [3eb6515]
  - @rulvar/core@1.102.0

## 1.101.0

### Patch Changes

- Updated dependencies [51b215c]
  - @rulvar/core@1.101.0

## 1.100.0

### Patch Changes

- Updated dependencies [9785bea]
  - @rulvar/core@1.100.0

## 1.99.1

### Patch Changes

- Updated dependencies [ef08d73]
  - @rulvar/core@1.99.1

## 1.99.0

### Patch Changes

- Updated dependencies [9e00888]
  - @rulvar/core@1.99.0

## 1.98.0

### Patch Changes

- @rulvar/core@1.98.0

## 1.97.0

### Patch Changes

- Updated dependencies [5c3b453]
  - @rulvar/core@1.97.0

## 1.96.0

### Patch Changes

- @rulvar/core@1.96.0

## 1.95.0

### Patch Changes

- @rulvar/core@1.95.0

## 1.94.0

### Patch Changes

- @rulvar/core@1.94.0

## 1.93.0

### Patch Changes

- Updated dependencies [c62150a]
  - @rulvar/core@1.93.0

## 1.92.0

### Patch Changes

- Updated dependencies [351d1f5]
  - @rulvar/core@1.92.0

## 1.91.0

### Patch Changes

- @rulvar/core@1.91.0

## 1.90.0

### Patch Changes

- Updated dependencies [9603940]
  - @rulvar/core@1.90.0

## 1.89.0

### Patch Changes

- Updated dependencies [f18b671]
- Updated dependencies [f18b671]
  - @rulvar/core@1.89.0

## 1.88.0

### Patch Changes

- Updated dependencies [3b339d9]
  - @rulvar/core@1.88.0

## 1.87.0

### Patch Changes

- Updated dependencies [c4c02b1]
  - @rulvar/core@1.87.0

## 1.86.0

### Patch Changes

- Updated dependencies [2f71894]
  - @rulvar/core@1.86.0

## 1.85.0

### Patch Changes

- 6932a9f: Three fail-closed fixes from the cycle 83 sweep, plus the dependency refresh.

  **Engine.** A typed error thrown out of `ProviderAdapter.stream()` now keeps its own class instead of being laundered into a retryable transport fault. A `ConfigError` (a bridged model id that does not match the wrapped model, an unsupported role, a namespaced option contradicting a canonical field) used to be retried through the whole backoff ladder and then trigger transport failover, so a misconfigured primary silently served the run from a fallback model the caller never asked for while the real fault vanished behind a generic message. Typed errors that ARE retryable by class (a lost lease) keep retrying exactly as before, and an untyped throw is still a retryable transport fault.

  **Planner sandbox.** The realm scrub replaced `Date.now` and `Math.random`, which left three ambient sources open: a bare `new Date()` never consults `Date.now` (V8 reads the system clock directly), `performance.now()` is a second live clock, and WebCrypto (`crypto.randomUUID()`, `crypto.getRandomValues()`) is raw entropy. Those are the first idioms a machine-written script reaches for, and each silently produced a run that could not reproduce on replay. All of them now draw from the same seeded stream: zero-argument `new Date()` and `Date()` take the logical clock, `performance.now()` is that clock minus the segment base, `crypto.randomUUID()` is the journaled uuid shim, and `crypto.getRandomValues()` fills from the seed. Passing a timestamp or a date string to `Date` stays a pure conversion.

  **Server.** A tracked run whose segment REJECTS instead of settling (the genesis ownership boot refusing a run another process owns, a withheld settlement whose durable write failed) was reported as `running` for the life of the process, its SSE connections never closed, and neither retention nor the settled cap could release it. `GET /runs/:id` now answers `status: "error"` with the typed wire error, connected streams close with a comment naming the failure, a late subscriber gets that comment instead of an empty stream, and the tracked run becomes eligible for retention like any other terminal run.

  **Dependencies.** `@anthropic-ai/sdk` moves to `^0.115.0` (the only shipped floor its caret was blocking); in-range minors refresh across the workspace. The four majors stay held: eslint 10 and `@eslint/js` 10, `@types/node` 26 against the Node 22.12 floor, and TypeScript 7. The tsdown resolution is pinned at 0.22.3 because it generates the frozen `.d.ts` artifacts, including the published `@rulvar/compat` tarball that must repack byte identical.

- Updated dependencies [6932a9f]
  - @rulvar/core@1.85.0

## 1.84.0

### Patch Changes

- @rulvar/core@1.84.0

## 1.83.0

### Patch Changes

- @rulvar/core@1.83.0

## 1.82.0

### Patch Changes

- Updated dependencies [9cc5d66]
  - @rulvar/core@1.82.0

## 1.81.2

### Patch Changes

- Updated dependencies [296885b]
  - @rulvar/core@1.81.2

## 1.81.1

### Patch Changes

- Updated dependencies [c030982]
  - @rulvar/core@1.81.1

## 1.81.0

### Patch Changes

- Updated dependencies [ce4c392]
  - @rulvar/core@1.81.0

## 1.80.0

### Patch Changes

- Updated dependencies [262e397]
  - @rulvar/core@1.80.0

## 1.79.0

### Patch Changes

- Updated dependencies [85956ab]
  - @rulvar/core@1.79.0

## 1.78.0

### Patch Changes

- Updated dependencies [941b6e1]
  - @rulvar/core@1.78.0

## 1.77.0

### Patch Changes

- Updated dependencies [6aba271]
  - @rulvar/core@1.77.0

## 1.76.0

### Patch Changes

- Updated dependencies [22cba47]
  - @rulvar/core@1.76.0

## 1.75.1

### Patch Changes

- Updated dependencies [82bc0f0]
  - @rulvar/core@1.75.1

## 1.75.0

### Minor Changes

- c486de8: The provider output floor and the finish arguments second chance (the v1.74 comparison review, P0.1 + P1.5). `ModelCaps.minOutputTokensPerTurn` declares the smallest request output cap the provider accepts (OpenAI Responses: 16; absent means one), and the layer-2b budget clamp never dispatches below it: the last-gasp turn goes out AT the floor instead of one token, a remainder that cannot buy the floor is refused as a typed `BudgetExhaustedError` with zero wire calls, and a configured per-turn cap below the floor is a `ConfigError`; `preflightEstimate` reports that configuration as the error finding `output-cap-below-provider-minimum`. Tool arguments an adapter delivered as the parse-failure wrapper `{__unparsed: raw}` now get one deterministic second chance before the schema rejection: a strict re-parse, then one bounded normalization (markdown fence, first balanced object, raw control characters escaped inside string literals); a recovered object that passes the tool schema executes as if it had parsed on the wire, with a warn log naming the pass, and replay or resume recovers identically with nothing journaled. The OpenAI wire re-projects an unparseable call as the ORIGINAL raw arguments string instead of the wrapper JSON, so a model no longer learns to imitate `{"__unparsed": ...}` from its own rewritten history. Both wires drop unsafe-integer `x-ratelimit` values instead of normalizing 400 digits into `Infinity`. `FakeAdapter` gains `capsOverrides` so offline tests can drive caps-declared behavior like the floor.

### Patch Changes

- Updated dependencies [c486de8]
  - @rulvar/core@1.75.0

## 1.74.0

### Minor Changes

- d94beab: Quota drift telemetry and the honest zero (the v1.71 experiment review, P0.5 resized + P1.4). The experiment declared 12M TPM over a provider-real 1M, the local limiter went quiet, and seven live 429s followed with nothing recording the mismatch. Now: both wire adapters parse the provider's x-ratelimit headers on every real 429 into normalized per-minute limits (`WireError.data.reportedLimits`; the openai wire also gains the raw bucket capture the anthropic wire already had), the loop remembers them per (provider, model) as live telemetry, and the opt-in `quota.declaredRules` (the SAME rule array preflight takes) makes the engine journal a `quota_drift` decision plus a warn log whenever a binding declared cap EXCEEDS the provider-reported one, per invocation and dimension, with anthropic's split input and output windows summed against a combined declared tokensPerMinute. Purely observational, synthetic limiter denials never count, and without declaredRules journals and events stay byte identical. On the invoice, an `unconfirmed` row that recorded zero usage on every counter now carries `usageUnknown: true` (export-level `usageUnknownRows` count, CLI `usage-unknown` marker): the zeros mean "nothing recorded", never "the provider metered nothing"; derived at export time, no journal shape change.

### Patch Changes

- Updated dependencies [d94beab]
  - @rulvar/core@1.74.0

## 1.73.0

### Patch Changes

- Updated dependencies [3e95bd1]
  - @rulvar/core@1.73.0

## 1.72.0

### Patch Changes

- Updated dependencies [662e9e0]
  - @rulvar/core@1.72.0

## 1.71.0

### Patch Changes

- Updated dependencies [20d02e0]
  - @rulvar/core@1.71.0

## 1.70.1

### Patch Changes

- @rulvar/core@1.70.1

## 1.70.0

### Patch Changes

- @rulvar/core@1.70.0

## 1.69.0

### Patch Changes

- Updated dependencies [b21a681]
  - @rulvar/core@1.69.0

## 1.68.0

### Patch Changes

- Updated dependencies [b227874]
  - @rulvar/core@1.68.0

## 1.67.0

### Patch Changes

- Updated dependencies [8e6006d]
  - @rulvar/core@1.67.0

## 1.66.0

### Patch Changes

- Updated dependencies [1b8987e]
  - @rulvar/core@1.66.0

## 1.65.0

### Patch Changes

- Updated dependencies [0b6b859]
  - @rulvar/core@1.65.0

## 1.64.0

### Patch Changes

- Updated dependencies [991f9b5]
  - @rulvar/core@1.64.0

## 1.63.0

### Patch Changes

- Updated dependencies [8a28aed]
  - @rulvar/core@1.63.0

## 1.62.0

### Patch Changes

- Updated dependencies [fca5fd1]
  - @rulvar/core@1.62.0

## 1.61.0

### Patch Changes

- Updated dependencies [b4c1f1f]
  - @rulvar/core@1.61.0

## 1.60.0

### Patch Changes

- Updated dependencies [59bbeaa]
  - @rulvar/core@1.60.0

## 1.59.4

### Patch Changes

- Updated dependencies [c49d7a1]
  - @rulvar/core@1.59.4

## 1.59.3

### Patch Changes

- Updated dependencies [deaef36]
  - @rulvar/core@1.59.3

## 1.59.2

### Patch Changes

- Updated dependencies [dd0e10f]
  - @rulvar/core@1.59.2

## 1.59.1

### Patch Changes

- Updated dependencies [c127770]
  - @rulvar/core@1.59.1

## 1.59.0

### Patch Changes

- Updated dependencies [615dc90]
  - @rulvar/core@1.59.0

## 1.58.0

### Patch Changes

- Updated dependencies [4fa35ce]
  - @rulvar/core@1.58.0

## 1.57.0

### Patch Changes

- Updated dependencies [5897232]
  - @rulvar/core@1.57.0

## 1.56.0

### Patch Changes

- Updated dependencies [f26dba0]
  - @rulvar/core@1.56.0

## 1.55.0

### Patch Changes

- Updated dependencies [e9b005b]
  - @rulvar/core@1.55.0

## 1.54.0

### Patch Changes

- Updated dependencies [3f6bc03]
  - @rulvar/core@1.54.0

## 1.53.0

### Patch Changes

- Updated dependencies [b821bd1]
  - @rulvar/core@1.53.0

## 1.52.0

### Patch Changes

- Updated dependencies [e138df9]
  - @rulvar/core@1.52.0

## 1.51.0

### Patch Changes

- @rulvar/core@1.51.0

## 1.50.0

### Patch Changes

- Updated dependencies [e39a885]
  - @rulvar/core@1.50.0

## 1.49.0

### Patch Changes

- Updated dependencies [bab7b2c]
  - @rulvar/core@1.49.0

## 1.48.0

### Patch Changes

- @rulvar/core@1.48.0

## 1.47.0

### Patch Changes

- Updated dependencies [a3687fe]
  - @rulvar/core@1.47.0

## 1.46.0

### Patch Changes

- Updated dependencies [865e7bf]
  - @rulvar/core@1.46.0

## 1.45.0

### Patch Changes

- Updated dependencies [b96305d]
  - @rulvar/core@1.45.0

## 1.44.1

### Patch Changes

- @rulvar/core@1.44.1

## 1.44.0

### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

## 1.43.0

### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

## 1.42.0

### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

## 1.41.0

### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

## 1.40.0

### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

## 1.39.0

### Patch Changes

- @rulvar/core@1.39.0

## 1.38.0

### Patch Changes

- @rulvar/core@1.38.0

## 1.37.0

### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

## 1.36.0

### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

## 1.35.0

### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

## 1.34.0

### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

## 1.33.0

### Patch Changes

- @rulvar/core@1.33.0

## 1.32.0

### Patch Changes

- @rulvar/core@1.32.0

## 1.31.0

### Patch Changes

- df6b8f8: `Retry-After` accepts HTTP optional whitespace padding only. ECMAScript `trim()` removed far more than the OWS production (space and horizontal tab), so values padded with newline, carriage return, vertical tab, form feed, or NBSP were honored as delays despite the documented exact delta seconds grammar; a real HTTP transport rejects most of those octets, but an injected SDK client or a mock does not. Both first party adapters now match `/^[\t ]*([0-9]+)[\t ]*$/` and fall back to the computed policy backoff for every other form.
  - @rulvar/core@1.31.0

## 1.30.0

### Patch Changes

- 87ce985: Parse `Retry-After` under the exact RFC delta seconds grammar (v1.29.0 review P3). Published 1.29.0 used `Number(header)`, which accepted far more than the documented delta seconds form: an empty or whitespace header became a 0 ms delay (an instant retry instead of the policy backoff), and hex (`0x10`), exponent (`1e3`), decimal (`1.5`), and signed (`+3`) forms were honored as delays. The value must now be a nonempty run of decimal digits after optional whitespace; every other form (the HTTP date included) omits `retryAfterMs` so the engine's computed backoff applies, and a huge digit run still clamps to the Node timer maximum.
- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

## 1.29.0

### Minor Changes

- 621d566: Make the retry and failover backoff interruptible and validate every provider supplied retry delay (v1.28.0 review P1 and P2).

  The retry engine now races its backoff wait against the host cancel signal (which the run deadline also drives) and the budget ceiling signal: an abort wakes the wait immediately, settles through the canonical aborted outcome (`cancelled` or `exhausted`, with every already recorded usage kept), and forbids every further dispatch, including the one behind a keyed limiter queue, so an adapter that ignores its signal can no longer be re entered after an abort. Previously a provider supplied `retryAfterMs` armed an uninterruptible sleep: a cancel, a crossed deadline, and a crossed budget ceiling all waited out the full backoff and the adapter was dispatched again. The injected `retry.sleep(ms)` test hook keeps its signature; a hook that loses the race is abandoned without an unhandled rejection, and the native timer path clears its timer so an abandoned long backoff never pins the event loop.

  `retryDelayMs` is now the defensive boundary the docs promise: only a finite nonnegative provider `retryAfterMs` replaces the computed delay, anything else (NaN, Infinity, a negative) is ignored as adapter noise, and every returned delay is a finite nonnegative integer clamped to the Node timer maximum, so a malformed or huge value can never arm an instant or overflowing timer. Both first party adapters stop emitting unvalidated `Retry-After` parses: an unparsable header (the HTTP date form included) omits `retryAfterMs` entirely instead of producing NaN (which also broke the `WireError.data` Json invariant by serializing to null), and a huge but finite value is clamped. The `mapAnthropicStream` TSDoc now states precisely how a truncated stream is reported (the `finished` flag on the return value, with the adapter synthesizing the terminal error).

  Four frozen fixture cassettes are refrozen for this release (the hashVersion-bump refreeze ceremony applies; hashVersion itself is unchanged and existing journals replay identically): in three cap freeze scenarios the main orchestrator entry now honestly settles cancelled at the cap instead of paying one more ordinary turn whose result the forced finish machinery discarded anyway, and one scenario loses a post abort wait suspension that can no longer be dispatched. Entry identities, keys, and every other row are byte identical.

### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

## 1.28.0

### Minor Changes

- d98eb0b: Enforce the terminal stream contract end to end (v1.27.0 deep E2E review P1 and P2). The runtime now fails closed when an adapter stream drains without a terminal `finish` or `error` event: the partial turn becomes a retryable transport fault that feeds the ordinary retry and failover machinery instead of settling as `ok` with truncated text, and a requested abort (cancel, budget ceiling, idle severance) remains a clean end with no fabricated provider error. Consumption stops at the first terminal event, so events after `finish` can no longer mutate the value, revise the authoritative bill, or trigger tool execution. The first party adapters enforce the same contract at the wire: the Chat Completions mapper no longer synthesizes `finish: stop` when the stream is cut before a `finish_reason` (usage the provider did report is still forwarded, half assembled tool calls are dropped), the Responses mapper fails closed on EOF without a response terminal event, and the Anthropic adapter surfaces a read cut before `message_stop` as a retryable transport error and no longer converts a caller requested abort during `messages.create()` into a terminal error. `mapResponsesStream` and `mapChatCompletionsStream` accept an optional `signal` so a requested abort keeps ending the stream without a terminal event. The VCR `record` wrapper now commits its cassette row even when the consumer stops reading at the terminal event (the engine always does now); adapter middleware must not rely on being drained past the terminal. The committed `combined-loop-descent` catalog cassette is refrozen because stopping consumption at the terminal shifts the deterministic interleaving of two parallel plan children by one scheduler turn; entry content, keys, and the actual `hashVersion` are unchanged, journals recorded under earlier versions replay unchanged, and this changeset carries the frozen fixture gate's hashVersion-bump ceremony token only to unlock that refreeze.

### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

## 1.27.0

### Minor Changes

- 884a433: Types referenced by public signatures are now exported from their package barrels, so the API docs resolve them instead of carrying known incomplete references (v1.26.0 deep E2E review): `BaseAppend` from `@rulvar/core` (the fields common to every `Replayer` append), `Block` and `MappedStop` from `@rulvar/anthropic` (the wire level content block alias and the stop reason mapping), and `VcrHeader` from `@rulvar/testing` (the first line of every cassette file). The frozen TypeDoc baseline shrinks from eleven entries to the four vendored Standard Schema notices.

### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

## 1.26.0

### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

## 1.25.0

### Patch Changes

- @rulvar/core@1.25.0

## 1.24.1

### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

## 1.24.0

### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

## 1.23.0

### Patch Changes

- 1f9c272: The `anthropic()` TSDoc no longer describes the SDK's ambient credentials as a precedence chain (v1.22.0 review P3-2). `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` are independent credentials: requests carry `x-api-key` for the key, bearer `Authorization` for the token, and BOTH headers when both are set; the config-file token-provider chain is consulted only when apiKey and authToken are both null. The providers guide already said exactly this; the source doc (and the generated API page built from it) had drifted.
- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

## 1.22.0

### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

## 1.21.0

### Patch Changes

- 7ee42a0: Declare `usageSemantics: 'anthropic-cache-additive-v1'` on the adapter: the additive reading it has always normalized under (the Anthropic wire genuinely excludes cache reads and writes from `input_tokens`, so canonical `inputTokens` is the sum of all three) now rides usage-bearing journal entries as an auditable policy stamp (v1.20.0 review P1/P2-2).
- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

## 1.20.0

### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

## 1.19.0

### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

## 1.18.0

### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

## 1.17.0

### Patch Changes

- @rulvar/core@1.17.0

## 1.16.2

### Patch Changes

- 9f07130: Correct five stale rows in the seed capability table: Claude Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 5, and Sonnet 4.6 all carry a 1M context window and 128k max output, verified against the official models table and live `GET /v1/models` on 2026-07-17. Default routing, the compaction threshold, and the wire `max_tokens` clamp no longer under-provision runs that never call `refreshCaps()` (Sonnet 5 was clamped to 64k output for no reason). Every row is now pinned by a committed `caps-snapshot.json`: an offline test fails when the table and the snapshot disagree, and the weekly live contract workflow audits the snapshot against the model list so provider-side drift pages instead of rotting. Pricing rows are untouched.
  - @rulvar/core@1.16.2

## 1.16.1

### Patch Changes

- fac1ecc: Treat explicit `apiKey: null`/`authToken: null` as absent credentials for the structured-auth env suppression, not as chosen ones. The SDK types allow `authToken?: string | null`, and on v1.16.0 a typed null beside `credentials`, `config`, or `profile` defeated the `=== undefined` suppression check, so an ambient `ANTHROPIC_API_KEY` (or, with `apiKey: null`, an ambient `ANTHROPIC_AUTH_TOKEN`) silently authenticated instead of the configured provider and billed a different principal. The suppression now uses nullish checks: any combination of unset and explicitly null keeps the configured provider in charge, while a real `apiKey`/`authToken` string next to structured auth still forwards verbatim under the SDK's own precedence (which never consults the provider once either is set). The [Anthropic credential precedence](https://docs.rulvar.com/guide/providers#anthropic-credential-precedence) docs now state the SDK's actual order: a set `apiKey` or `authToken` disables token providers entirely; providers run only when both are null; a named `profile` skips both env reads inside the SDK itself.
  - @rulvar/core@1.16.1

## 1.16.0

### Minor Changes

- 5f76cf2: Structured auth wins over ambient env (v1.15 review P2-2). The underlying SDK lets any `apiKey`, one it read from `ANTHROPIC_API_KEY` included, beat a configured `credentials`/`config`/`profile` token provider: the provider was called zero times and requests carried `x-api-key` from the environment. When `sdkOptions` carries structured auth and no `apiKey`/`authToken` is set anywhere, the adapter now passes explicit `apiKey: null, authToken: null` to the SDK, so the configured provider is the one that authenticates regardless of what the environment exports. Setting an `apiKey` or `authToken` yourself next to structured auth keeps verbatim forwarding and the SDK's own precedence, which is now documented exactly (apiKey, then token providers, then authToken). Covered by synthetic tests for the provider, an end-to-end file-backed `profile` (static `user_oauth` token, `ANTHROPIC_CONFIG_DIR` isolated, 0600 credentials), and the explicit-key-beside-provider case.

### Patch Changes

- @rulvar/core@1.16.0

## 1.15.0

### Minor Changes

- 4aee1f3: Production auth surface (v1.14 review P2-2). New `sdkOptions` on `AnthropicAdapterOptions` forwards official SDK construction options verbatim, `maxRetries` excluded from the type (`AnthropicSdkOptions`) and forced to 0: bearer `authToken`, an `AccessTokenProvider` via `credentials`, `config` (OIDC/workload-identity federation), `profile`, plus `fetch`, `timeout`, and `defaultHeaders`. The `client` option now accepts the official `Anthropic` instance directly under strict TypeScript, no casts, alongside the structural `AnthropicClientLike` mock; an injected client with SDK autoretries enabled (`maxRetries !== 0`) is rejected with a typed `ConfigError`, as are `client` combined with construction options and the same field set both top-level and in `sdkOptions`, all before any network I/O. The implicit SDK credential chain (`ANTHROPIC_API_KEY`, then bearer `ANTHROPIC_AUTH_TOKEN`, then config files) is now documented and covered by tests.

### Patch Changes

- @rulvar/core@1.15.0

## 1.14.0

### Patch Changes

- @rulvar/core@1.14.0

## 1.13.0

### Patch Changes

- @rulvar/core@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

## 1.11.0

### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

## 1.9.0

### Minor Changes

- 7577f8e: Correct the Anthropic fallback pricing to the official table and export versioned price tables from both first-party adapters.

  The `ANTHROPIC_MODELS` seed rows had never been audited against the published price list and overcharged every current Claude model: Fable 5 was seeded at exactly 2x the official rate (20/100 vs 10/50 per MTok, cache rates likewise), Opus 4.8 at 12/60 vs 5/25, Opus 4.7 at 10/50 vs 5/25, and Opus 4.6 at 15/75 vs 5/25. Claude Sonnet 5 now carries its introductory price (2/10, in effect through 2026-08-31); Haiku 4.5 and Sonnet 4.6 were already correct. Cost reports for affected models drop accordingly, and budget ceilings admit roughly twice the work they previously rejected.

  New exports `ANTHROPIC_PRICING` (`anthropic-2026-07-16`) and `OPENAI_PRICING` (`openai-2026-07-16`) publish the seed rows as versioned `PriceTable`s for `createEngine({ pricing })`, so runs journal a concrete pricing version instead of `unpriced` and price revisions become explicit table updates. `createTestEngine` gained a `pricing` passthrough for testing against a versioned table.

### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

## 1.6.0

### Minor Changes

- df416fc: Correct and extend model pricing: GPT-5.6 entries, long-context tiers, no fabricated prices, no double-charged cache.

  - `Pricing` gains optional long-context `tiers` (`PricingTier`): the highest threshold strictly below the full prompt re-prices the entire request, input-side rates (cache included) scaling by `inputMultiplier` and the output rate by `outputMultiplier`. Existing linear rows are untouched.
  - `@rulvar/openai` seeds `gpt-5.6-sol` and its `gpt-5.6` alias with the official caps and pricing (1,050,000 context, 128,000 max output, $5/$0.50/$30 per MTok, $6.25 cache write, 2x input and 1.5x output above 272K input tokens). Previously the unknown-model fallback silently priced them as gpt-5.4.
  - Unknown model ids in both first-class adapters keep conservative transport caps but no longer receive a fabricated price row: their usage surfaces in `CostReport.unpriced` and a USD ceiling warns that it cannot bound them. Provide a versioned `createEngine({ pricing })` row for hosted models the tables do not know yet.
  - `priceUsdOf` no longer double-charges cache tokens: under the Usage invariant `inputTokens` is the full prompt, so the input rate now bills only the uncached remainder while cache reads and writes bill at their own rates (a row without cache rates bills them at the input rate). Cache-heavy runs previously over-attributed cost by the full input rate on every cached token.
  - Admission reserve estimation routes through the same `priceUsdOf`, so estimates and settled costs share one formula, tiers included.
  - Model id resolution picks the longest matching table prefix, so a dated `gpt-5.5-pro-...` snapshot resolves to the pro entry, never the shorter `gpt-5.5` sibling.

- 886d065: Make the first-class adapters genuinely streaming: every canonical event is yielded AS its provider event is consumed.

  Both adapters (and `openaiCompatible`) buffered the complete canonical event stream in an internal array and yielded it only after the provider response finished. Consequences fixed by this change: `agent:stream` was never live; the stream-idle watchdog saw zero events during healthy generation, so any turn longer than `streamIdleTimeoutMs` (default 120s) was falsely severed as idle and retried; a budget or external abort lost ALL partial usage (the journal recorded zero for tokens the provider billed); and every delta of a long response was retained in memory.

  - `mapAnthropicStream`, `mapResponsesStream`, and `mapChatCompletionsStream` are now async generators: they yield each `ChatEvent` as the corresponding provider event is consumed, with the consumer's pull as the only pacing (natural backpressure, no queue, no detached work). The Anthropic mapper's return value carries the accumulated `pause_turn` state; `TurnMapping` no longer has the redundant `events` array field. Callers of the old callback signatures (`emit` parameter) must switch to iterating the generator.
  - Adapter behavior is preserved: canonical id mapping, thinking/reasoning retention, `pause_turn` continuation and its cap (each segment now streams live before the continuation dispatches), tool argument assembly, typed refusals and errors, exactly one canonical terminal event, the degraded Chat Completions path (visible in `providerMetadata.openai.degradedPath`), abort propagation, usage normalization, and SDK autoretries disabled.
  - New regression tests with gated fake SDK clients prove the first `stream().next()` resolves before the provider terminal exists, aborts reach the in-flight provider iterable after the first delta, a paused consumer causes zero read-ahead (lock-step pulls), `pause_turn` segment deltas arrive before the continuation request, and exactly one terminal event survives.

### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.
- Updated dependencies [da4dbad]
- Updated dependencies [487da86]
- Updated dependencies [df416fc]
- Updated dependencies [a737810]
- Updated dependencies [9eb66b4]
  - @rulvar/core@1.6.0

## 1.5.2

### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

## 1.5.1

### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

## 1.4.0

### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

## 1.2.0

### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

## 1.1.0

### Patch Changes

- f2253cb: The adapter scrubs constrained-decoding-unsupported keywords from the wire copy of strict tool schemas and output format schemas (`minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `maxItems`; measured live, docs/04 section 4.3 as amended). The orchestrator's spawn tools carry integer minimums, so every live orchestrate run died with a pre-first-call 400 ("For 'integer' type, property 'minimum' is not supported") at zero cost, which is what kept criterion 2 of the M12 checkpoint unmeasurable. The engine-side schema stays unscrubbed and still validates tool args and structured output, so the dropped keywords remain enforced; only the model-side hint is lost.
- 63b2c01: Two defects the first live M12 checkpoint run surfaced. The Anthropic capability table lacked a Haiku 4.5 entry, so the dated id fell through to the current-generation default and the adapter sent adaptive thinking, which that model rejects with a live 400 (every haiku run died at zero cost): `claude-haiku-4-5` (and its dated snapshots by the prefix rule) now resolves to the enabled-budget thinking form with real haiku pricing, meaning the default wire omits thinking entirely. And the checkpoint's criterion 2 could pass vacuously when both arms scored zero at zero cost (zero satisfies "at least equal at no more cost"): the card-informed arm must now win something real (nonzero n and pass rate) before the criterion can hold.
- 99dc3ed: The second Haiku 4.5 wire incompatibility (the first live probe after the caps entry): the model also rejects the top-level effort parameter with a 400, so its capability entry now declares empty reasoningEfforts and the router scrubs effort off the wire (the requested effort stays in identity). Verified live: a haiku run completes ok.
- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies [0e0b569]
- Updated dependencies [b28b7a3]
- Updated dependencies [b53a89e]
- Updated dependencies [4454175]
- Updated dependencies [6599ca8]
- Updated dependencies [6649e5f]
- Updated dependencies [fd2f83b]
- Updated dependencies [01d6b2d]
- Updated dependencies [9a20dbb]
- Updated dependencies [0fbe7ea]
- Updated dependencies [ebe0abc]
- Updated dependencies [a3079d0]
- Updated dependencies [596a39b]
- Updated dependencies [464ab6e]
  - @rulvar/core@1.0.0

## 0.9.0

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [85d55cf]
- Updated dependencies [b88c9e3]
- Updated dependencies [f3c4613]
- Updated dependencies [a41c20f]
- Updated dependencies [f4e70be]
- Updated dependencies [75d1646]
- Updated dependencies [0627413]
- Updated dependencies [55c0f87]
- Updated dependencies [fd33871]
- Updated dependencies [e70e7f4]
- Updated dependencies [bc9c903]
  - @rulvar/core@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

## 0.5.0

### Minor Changes

- ac274f4: M4-T01 role protocol completion. The full trigger protocol for the six
  invocation roles lands in `@rulvar/core` (`model/roles.ts`):

  - Extract necessity is completed per docs/04 section 8.3: a separate
    final structured-output invocation fires when a schema is set AND
    (routing directs extract to a different model OR the loop model's
    required tier cannot ride a tools-available turn OR finalize is
    routed). The required-tier rule is new: a `forced-tool` tier pins
    toolChoice to `emit_result` and cannot ride while the agent's tools
    must remain available, so such agents now pay one separate extract
    call instead of silently losing tool access. Agents without tools
    keep the M1 single-shot behavior byte for byte.
  - The finalize role fires for the first time: only when configured in
    routing and only for tool-bearing agents, as one synthesis invocation
    with toolChoice `'none'` over the full transcript after tools stop.
    Its text is the output for schema-less calls; with a schema the
    separate extract runs over the transcript including the synthesis.
  - A separate extract invocation over a tool-bearing transcript now
    carries the agent's tool contracts (both providers reject tool-use
    history without tool definitions) with toolChoice pinned to `'none'`
    or to `emit_result` per tier.
  - Both adapters map `toolChoice: 'none'` to the provider's explicit
    none choice with the tools param present instead of dropping tools
    from the request.
  - `createTestEngine` no longer routes `finalize` by default: the
    routing key is the firing opt-in, and the old default would have
    summoned a synthesis call for every tool-bearing test agent. Tests
    that want finalize route it explicitly.

  Identity is untouched: extract and finalize resolutions never enter
  the spawn content key, and existing journals replay unchanged.

- 5735d92: M4-T02 HistoryProjector. Cross-provider history projection lands in
  `@rulvar/core` (`model/projector.ts`) and the retention pipeline that
  feeds it:

  - `projectHistory` projects the canonical history into a target
    provider's view: provider-raw parts ride if and only if the target
    adapter's provider family matches the part's provider; everything
    else passes through untouched. The agent loop projects EVERY outgoing
    request (loop turns, finalize, extract), so per-role provider mixing
    inside one agent yields a valid wire history on each side.
  - Retention transport: adapters ship a turn's blocks-to-retain in
    stream order via `finish.providerMetadata[<adapter id>].retainedParts`;
    the runtime lifts them into provider-raw parts at the HEAD of the
    turn's canonical assistant message. `@rulvar/anthropic` ships thinking
    and redacted_thinking blocks (signatures intact, pause_turn
    continuations included); `@rulvar/openai` ships reasoning items with
    their encrypted_content. Retained blocks now actually reach the
    canonical history, survive checkpoints, and echo byte-exact to their
    own provider on every subsequent turn.
  - `ProviderAdapter` gains an optional `provider` field: the provider
    family for provider-raw matching (default = adapter id). The
    first-class adapters declare 'anthropic' and 'openai';
    `openaiCompatible` gateways declare 'openai' whatever their custom id,
    so same-family adapters share retained blocks and projections.

  Identity is untouched: projection state never enters content keys, and
  adapters that ship no retention payload (FakeAdapter included) produce
  byte-identical histories.

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

## 0.2.0

### Minor Changes

- 527c9b4: M1-T12/T13: the two first-class adapters on the July 2026 surfaces.
  @rulvar/anthropic: adaptive thinking, the output_config umbrella (effort
  passthrough including max, native json_schema format), strict tools,
  cache_control compilation from cacheHint (deepest-4 kept), thinking-block
  retention with provider-granularity projection, pause_turn absorption
  without synthetic user messages, the full stop-reason table with typed
  refusal stop details, count_tokens, capabilities-bearing refreshCaps,
  retry-after/x-ratelimit/529 signaling, SDK autoretries disabled, usage
  normalization under the Usage invariant. @rulvar/openai: Responses API
  with manual item replay only (store false, encrypted reasoning echoed
  verbatim; previous_response_id/Conversations rejected as ConfigError),
  flattened strict function tools, text.format json_schema, the typed SSE
  catalog mapped to ChatEvent, the Chat Completions degraded path (visible
  via providerMetadata), effort mapping with the documented lossy
  max-to-xhigh downmap and provider none via providerOptions only, usage
  normalization.

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

## 0.1.0

### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0
