/**
 * The only way code reaches lib/auth/native-session: through this loader,
 * whose condition is a build-time literal. In the web build the import edge
 * is dropped, so the app's token handling is not even emitted as a chunk.
 */
export const loadNativeSession =
  process.env.NEXT_PUBLIC_BUILD_TARGET === "native"
    ? () => import("./native-session")
    : () => Promise.reject(new Error("lib/auth/native-session is not part of the web build"));
