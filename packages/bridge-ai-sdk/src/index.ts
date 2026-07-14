/**
 * @rulvar/bridge-ai-sdk: wraps any Vercel AI SDK LanguageModelV4 as a
 * Rulvar ProviderAdapter (https://docs.rulvar.com/guide/providers).
 * Documented as the highest-churn package of the
 * set: it tracks the @ai-sdk/provider major line and its provider-major
 * bumps are the most likely driver of post-1.0 BREAKING majors.
 */
export { bridgeAiSdk, aiSdkErrorToWire, type BridgeAiSdkOptions } from './bridge.js';
