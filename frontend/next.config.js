// next.config.js – High Prosper Services (Next.js 16.1.1 Optimized)

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Server Actions – Secure (CSRF protection)
    experimental: {
        serverActions: {
            allowedOrigins: [
                "localhost:3000",
                "127.0.0.1:3000",
                "192.168.1.104:3000",
                "highprosper.rw", // Add your production domain
                // Add staging/preview domains if needed
            ],
        },
    },

    // Images – Optimized for your assets + external sources
    images: {
        unoptimized: true, // Required for canvas exports / sharp issues
        remotePatterns: [
            { protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" },
            { protocol: "http", hostname: "127.0.0.1", port: "3000", pathname: "/**" },
            { protocol: "http", hostname: "192.168.1.104", port: "3000", pathname: "/**" },
            { protocol: "https", hostname: "**" }, // Allows all external HTTPS images
        ],
    },

    // Optional: Keep if you need it (some libs still double-render)
    reactStrictMode: false,

    // Logging – Great for debugging API calls
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
};

export default nextConfig;