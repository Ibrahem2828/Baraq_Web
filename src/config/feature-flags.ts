import { publicEnv } from "./env.public";

/**
 * Client-safe feature flags. Mirrors the intent of the mobile app's
 * `src/config/featureFlags.ts`, adapted to the web app's actual rollout state.
 *
 * Subscription checkout remains disabled until a payment provider exists.
 */
export const featureFlags = {
  /** Kholasa (summarization) character flow. Backend-ready, mobile ships "coming soon". */
  kholasa: publicEnv.NEXT_PUBLIC_FEATURE_KHOLASA,
  /** Sada (transcription) character flow. Backend-ready, mobile ships "coming soon". */
  sada: publicEnv.NEXT_PUBLIC_FEATURE_SADA,
  /** Self-service deletion is backed by DELETE /api/v1/users/me/. */
  accountDeletion: true as const,
  /**
   * Subscription checkout / plan upgrade. No payment provider is wired up on
   * the backend (`PAYMENTS_ENABLED` exists as a flag but no Stripe/PayPal
   * integration is implemented) — keep this off until billing exists.
   */
  subscriptionsCheckout: false as const,
} satisfies Record<string, boolean>;

export type FeatureFlagKey = keyof typeof featureFlags;
