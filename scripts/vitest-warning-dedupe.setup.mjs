// Vitest setupFiles entry: installs the RulvarWarning dedupe wrapper in
// every worker process. The logic lives side-effect free in
// vitest-warning-dedupe.mjs so its failure modes are unit-testable.
import { installRulvarWarningDedupe } from './vitest-warning-dedupe.mjs';

installRulvarWarningDedupe();
