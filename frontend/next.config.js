/** @type {import('next').NextConfig} */
const nextConfig = {
    // ─── Core Settings ────────────────────────────────────────────────────────
    reactStrictMode: false,

    // ─── Server Actions Security ──────────────────────────────────────────────
    experimental: {
        serverActions: {
            allowedOrigins: [
                'localhost:3000',
                '127.0.0.1:3000',
                '192.168.*:3000',
                'highprosper.rw',
                '*.highprosper.rw',
            ],
        },
    },

    // ─── Image Optimization ───────────────────────────────────────────────────
    images: {
        // Keep optimization ON (no unoptimized: true)
        remotePatterns: [
            // This is enough when using proxy (relative paths)
            {
                protocol: 'http',
                hostname: 'localhost',
                pathname: '/media/**',
            },
            // Production
            {
                protocol: 'https',
                hostname: 'highprosper.rw',
                pathname: '/media/**',
            },
            {
                protocol: 'https',
                hostname: 'api.highprosper.rw',
                pathname: '/media/**',
            },
            // Optional: allow external (restrict in prod)
            {
                protocol: 'https',
                hostname: '**',
            },
        ],

        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60,
        formats: ['image/avif', 'image/webp'],
    },

    // ─── Proxy: This is the magic that fixes EVERYTHING ───────────────────────
    async rewrites() {
        return [
            {
                source: '/media/:path*',
                destination: 'http://127.0.0.1:8000/media/:path*', // dev
                // Production (use env var):
                // destination: `${process.env.BACKEND_URL || 'https://api.highprosper.rw'}/media/:path*`,
            },
        ];
    },

    // ─── Debugging ────────────────────────────────────────────────────────────
    logging: {
        fetches: {
            fullUrl: true,
        },
    },

    // ─── Performance ──────────────────────────────────────────────────────────
    swcMinify: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },
};

export default nextConfig;