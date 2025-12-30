// lib/api.js — ENTERPRISE-GRADE API CLIENT WITH TOP LOADING BAR (2025-PROOF)
"use client";

import axios from "axios";
import Cookies from "js-cookie";

// ──────────────────────────────────────────────────────────────
// API CLIENT – Enterprise-Grade, Multi-Tenant Ready (2025+)
// ──────────────────────────────────────────────────────────────

const API_BASE_URL = (() => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;

    if (envUrl) {
        return envUrl.endsWith("/") ? envUrl : envUrl + "/";
    }

    if (process.env.NODE_ENV === "development") {
        console.warn(
            "⚠️ NEXT_PUBLIC_API_URL not set — falling back to localhost. Set it in .env.local!"
        );
        return "http://127.0.0.1:8000/api/v1/";
    }

    throw new Error("NEXT_PUBLIC_API_URL is required in production");
})();

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
    withCredentials: true,
});

// ─────────────────────
// GLOBAL LOADING COUNTER
// ─────────────────────
let activeRequests = 0;

const showLoading = () => {
    activeRequests++;
    if (activeRequests === 1) {
        window.dispatchEvent(new Event("apiLoadingStart"));
    }
};

const hideLoading = () => {
    activeRequests--;
    if (activeRequests <= 0) {
        activeRequests = 0;
        window.dispatchEvent(new Event("apiLoadingEnd"));
    }
};

// ─────────────────────
// REQUEST INTERCEPTOR
// ─────────────────────
api.interceptors.request.use(
    (config) => {
        showLoading();

        // Attach Django Token (TokenAuthentication)
        const token = Cookies.get("token");
        if (token) {
            config.headers.Authorization = `Token ${token}`;
        }

        // Handle FormData (file uploads)
        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        }

        // Cache-busting for GET requests
        if (config.method?.toLowerCase() === "get") {
            config.params = {
                ...config.params,
                _t: Date.now(),
            };
        }

        return config;
    },
    (error) => {
        hideLoading();
        return Promise.reject(error);
    }
);

// ─────────────────────
// RESPONSE INTERCEPTOR
// ─────────────────────
api.interceptors.response.use(
    (response) => {
        hideLoading();
        return response;
    },
    (error) => {
        hideLoading();

        if (error.response) {
            const { status } = error.response;

            if (status === 401 || status === 403) {
                console.warn("Auth failed — redirecting to login");
                Cookies.remove("token");
                Cookies.remove("user");
                if (typeof window !== "undefined") {
                    const next = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/login?next=${next}`;
                }
            }

            if (status === 404) {
                console.warn(`API 404: ${error.config?.url}`);
            }

            if (status >= 500) {
                console.error("Server error:", error.response.data);
            }
        } else if (error.code === "ERR_NETWORK") {
            console.error("Network error — backend down or CORS issue");
        }

        return Promise.reject(error);
    }
);

export default api;