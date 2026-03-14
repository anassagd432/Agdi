/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Docker production builds (creates a self-contained .next/standalone dir)
  output: 'standalone',

  // ── Performance ──────────────────────────────────────────────────────────
  // Tree-shake lucide-react: import only the icons actually used per page
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // Compress output with gzip
  compress: true,

  // Limit build-time memory
  experimental: {
    // Parallelize server component rendering
    serverMinification: true,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            // Prevent information leakage via Referer header
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            // Disable unused browser features
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          {
            // Modern CSP replaces X-XSS-Protection
            key: 'X-XSS-Protection',
            value: '0'
          },
          {
            // Content Security Policy — restrictive defaults
            // Allow WebSocket to local gateway + Docker service name
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' ws://127.0.0.1:18789 ws://localhost:18789 ws://agdi-gateway:18789 http://127.0.0.1:18789 http://localhost:18789",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;