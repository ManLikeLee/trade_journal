/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// The API origin the browser is allowed to call. Must match NEXT_PUBLIC_API_URL.
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000/api').replace(
  /\/api\/?$/,
  '',
);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTENT SECURITY POLICY — REPORT ONLY
 *
 * Served as Content-Security-Policy-Report-Only: it reports violations to the
 * console and blocks nothing, so a mistake here cannot take the app down.
 *
 * Two violations it will report today, both expected:
 *
 *   1. The inline theme script in app/layout.tsx (dangerouslySetInnerHTML). It
 *      must run before paint to avoid a light/dark flash, so it cannot simply
 *      move to an external file.
 *   2. Next.js's own inline bootstrap (self.__next_f.push(...)), emitted on
 *      every page for streaming and hydration.
 *
 * ⚠️ `'unsafe-inline'` on script-src is what would make both pass, and it
 * materially weakens CSP against the XSS this task exists to defend against —
 * it is the one directive that matters most here. The real fix is a per-request
 * nonce issued in middleware and threaded through Next's script tags, or a
 * SHA-256 hash of the theme script. That is a focused follow-up. Promote this
 * policy to enforcing mode only once the nonce work lands; enforcing it as
 * written would give weaker protection than its presence suggests.
 *
 * 'unsafe-eval' is required by webpack HMR in development only and is omitted
 * from production builds.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isDev ? ' ws: http://127.0.0.1:* http://localhost:*' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: csp },
  // A no-op over plain HTTP; correct the moment this is served over TLS.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // frame-ancestors 'none' above is the modern control; this covers older browsers.
  { key: 'X-Frame-Options', value: 'DENY' },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', '127.0.0.1:3000'] },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: '/', destination: '/dashboard', permanent: false },
    ];
  },
};

module.exports = nextConfig;
