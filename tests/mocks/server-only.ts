// Vitest alias target for the `server-only` package (see vitest.config.ts),
// mirroring the approach already used in Baraq_Dashboard_Professional's
// vitest config: unit tests run outside Next's RSC bundler, where the real
// `server-only` package's throw-on-client-import guard would otherwise
// break every test that imports a server-only module.
export {};
