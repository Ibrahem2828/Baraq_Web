/**
 * The production image must be reproducible without a build-time request to
 * a third-party font CDN. The project does not ship licensed local copies of
 * the former brand fonts, so tokens.css deliberately supplies Arabic-first
 * and Latin system-font fallbacks instead.
 *
 * Keeping this export lets the root layout retain a stable className contract
 * if local, licensed font files are added in a reviewed future change.
 */
export const fontVariables = "";
