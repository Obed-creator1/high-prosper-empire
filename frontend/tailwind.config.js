// tailwind.config.js — MODERN & PROFESSIONAL 2025 (WITH FORMS)
import animate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";
import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: { "2xl": "1400px" },
        },
        extend: {
            // Colors
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "#a855f7",
                    foreground: "#ffffff",
                },
                secondary: {
                    DEFAULT: "#ec4899",
                    foreground: "#ffffff",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "#06b6d4",
                    foreground: "#ffffff",
                },
                destructive: {
                    DEFAULT: "#ef4444",
                    foreground: "#ffffff",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                prosper: {
                    purple: "#a855f7",
                    cyan: "#06b6d4",
                    pink: "#ec4899",
                    neon: "#00ffcc",
                    void: "#0f0f1e",
                    empire: "#1e0033",
                },
            },

            // Typography & boldness
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                heading: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
            },
            fontWeight: {
                thin: 100,
                extralight: 200,
                light: 300,
                normal: 400,
                medium: 500,
                semibold: 600,
                bold: 700,
                extrabold: 800,
                black: 900,
            },

            // Modern borders & radius
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                pill: "9999px",
            },

            // Hover & focus
            boxShadow: {
                sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                neon: "0 0 20px rgba(168, 85, 247, 0.5)",
            },

            // Animations
            animation: {
                "fade-in": "fadeIn 0.6s ease-out forwards",
                "fade-in-up": "fadeInUp 0.8s ease-out forwards",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "spin-slow": "spin 20s linear infinite",
                "neural-glow": "neuralGlow 6s ease-in-out infinite alternate",
            },
            keyframes: {
                fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
                fadeInUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
                neuralGlow: { "0%": { boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)" }, "100%": { boxShadow: "0 0 60px rgba(168, 85, 247, 0.7)" } },
            },

            // Backdrop blur
            backdropBlur: { xs: "2px", sm: "4px", md: "8px" },
        },
    },
    plugins: [
        animate,
        containerQueries,
        forms({ strategy: "class" }), // Enables modern form styling
    ],
};