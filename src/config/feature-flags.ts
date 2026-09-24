/**
 * Client-side product flags for features that genuinely lack a backend
 * implementation. AI-character authorization is intentionally absent here:
 * Django's capabilities contract is its sole authority.
 */
export const featureFlags = {
  /** Self-service deletion is backed by DELETE /api/v1/users/me/. */
  accountDeletion: true as const,
  /** No payment-provider contract exists on the backend yet. */
  subscriptionsCheckout: false as const,
} satisfies Record<string, boolean>;

export type FeatureFlagKey = keyof typeof featureFlags;
