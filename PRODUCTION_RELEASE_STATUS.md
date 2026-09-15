# Baraq Web production release status

The production web application is hosted at `https://web.baraqapp.com`. The
marketing site remains at `https://baraqapp.com`.

## Release gates

- `npm ci`
- production environment validation
- strict TypeScript check
- ESLint
- unit tests
- Next.js production build with standalone output
- production Docker image build and `/api/health` smoke test in CI

The authenticated account-deletion flow uses `DELETE /api/v1/users/me/`
through the CSRF-protected BFF. The BFF clears its host-only HttpOnly access
and refresh cookies after a successful deletion.

Production cookies remain Secure and host-only. The browser never receives
`BACKEND_API_URL` or authentication tokens.

The release is deployable only by an exact approved commit SHA after its
GitHub Actions workflow passes. Production secret injection, TLS routing,
database backup, and VPS deployment remain deployment-time responsibilities.
