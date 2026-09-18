import { Almarai, IBM_Plex_Sans_Arabic, IBM_Plex_Sans, Poppins } from "next/font/google";

/**
 * Font stack ported verbatim from `Baraq_Website` (`css/style.css`):
 * Almarai + IBM Plex Sans Arabic for Arabic pages, Poppins + IBM Plex Sans
 * for English. Loaded via `next/font/google` (self-hosted at build time,
 * zero layout shift) instead of the marketing site's runtime Google Fonts
 * `<link>`, and exposed as CSS variables consumed by design-system/tokens.css.
 */
export const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
  preload: false,
});

export const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
  preload: false,
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
});

export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
  preload: false,
});

export const fontVariables = `${almarai.variable} ${ibmPlexSansArabic.variable} ${poppins.variable} ${ibmPlexSans.variable}`;
