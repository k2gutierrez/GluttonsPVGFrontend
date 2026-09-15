import type { NextConfig } from 'next';

const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  // Preserve wallet popups while isolating the top-level app from unrelated opener contexts.
  {key:'Cross-Origin-Opener-Policy',value:'same-origin-allow-popups'},
  {key:'X-DNS-Prefetch-Control',value:'on'},
];

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  poweredByHeader: false,
  compress: true,
  async headers(){return[{source:'/:path*',headers:securityHeaders}]},
};

export default nextConfig;
