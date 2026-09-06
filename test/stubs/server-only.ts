// `server-only` throws when imported outside a React Server Component, which
// includes the vitest node environment. The guard is a build-time contract for
// Next, not a runtime behaviour we need in tests, so it is aliased to this
// no-op. See vitest.config.mts.
export {};
