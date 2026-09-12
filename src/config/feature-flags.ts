import { publicEnv } from "./env.public";

/**
 * Client-safe feature flags. Mirrors the intent of the mobile app's
 * `src/config/featureFlags.ts`, adapted to the web app's actual rollout state.
 *
 * Flags gating functionality the backend does not yet expose (account
 * deletion, subscription checkout) default to `false` regardless of env so a
 * misconfigured deployment never advertises a feature with no working API.
 */
export const featureFlags = {
  /** Kholasa (summarization) character flow. Backend-ready, mobile ships "coming soon". */
  kholasa: publicEnv.NEXT_PUBLIC_FEATURE_KHOLASA,
  /** Sada (transcription) character flow. Backend-ready, mobile ships "coming soon". */
  sada: publicEnv.NEXT_PUBLIC_FEATURE_SADA,
  /**
   * Self-service account deletion. No backend endpoint exists yet
   * (`DELETE /users/me/` is not implemented) — keep this off until the
   * backend team ships a real contract. See docs/WEB_API_CONTRACT_MAP.md.
   */
  accountDeletion: false as const,
  /**
   * Subscription checkout / plan upgrade. No payment provider is wired up on
   * the backend (`PAYMENTS_ENABLED` exists as a flag but no Stripe/PayPal
   * integration is implemented) — keep this off until billing exists.
   */
  subscriptionsCheckout: false as const,
} satisfies Record<string, boolean>;

export type FeatureFlagKey = keyof typeof featureFlags;
