import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',

  devIndicators: {
    position: 'bottom-right',
  },

  // تعطيل جميع عناصر واجهة المطور والـ Dev Overlay
  webpack: (config: any, { dev }: { dev: boolean }) => {
    if (dev) {
      // تعطيل الـ Hot Module Replacement indicators
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
      };
    }
    return config;
  },

  // Allow cross-origin requests from tunneling services (ngrok, etc.) in development
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['ngrok-free.app', 'ngrok-free.dev', 'ngrok.io', 'tunnelto.dev', 'localhost', 'fitting-singularly-heron.ngrok-free.app', 'aiyana-uncurried-zonally.ngrok-free.dev', 'tychistic-ira-stretchiest.ngrok-free.dev'],
  }),

  // إضافة headers لتعطيل development indicators
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          // إخفاء Next.js development indicators
          { key: 'X-Nextjs-Dev-Overlay', value: 'false' },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  env: {
    BACKEND_URL: process.env.BACKEND_URL,
  },

  images: {
    domains: ['localhost', 'ngrok-free.app', 'ngrok-free.dev', 'ngrok.io'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default withNextIntl(nextConfig);
