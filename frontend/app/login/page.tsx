"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/api";
import {
    FiMail,
    FiUser,
    FiLock,
    FiEye,
    FiEyeOff,
    FiX,
} from "react-icons/fi";

export default function LoginPage() {
    const router = useRouter();

    // ------------------- LOGIN STATES -------------------
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // ------------------- PASSWORD RESET STATES -------------------
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetStep, setResetStep] = useState(1);
    const [resetEmail, setResetEmail] = useState("");
    const [resetOtp, setResetOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetMessage, setResetMessage] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);

    // ------------------- AUTO REDIRECT / TOKEN VERIFY -------------------
    useEffect(() => {
        const verifyToken = async () => {
            const token = Cookies.get("token");
            const role = Cookies.get("role")?.toLowerCase(); // normalize

            if (token && role) {
                try {
                    await api.get("/auth/verify-token/", {
                        headers: { Authorization: `Token ${token}` },
                    });

                    // Dynamic redirect based on role
                    const validRoles = [
                        "ceo",
                        "admin",
                        "hr",
                        "staff",
                        "manager",
                        "supervisor",
                        "collector",
                        "driver",
                        "customer",
                        "accounting",
                    ];

                    const redirectPath = validRoles.includes(role)
                        ? `/dashboard/${role}`
                        : "/";

                    router.replace(redirectPath);
                } catch {
                    // invalid token -> clear cookies
                    Cookies.remove("token");
                    Cookies.remove("role");
                    Cookies.remove("username");
                }
            }
        };

        verifyToken();
    }, [router]);

    // ------------------- HANDLE LOGIN -------------------
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccessMessage("");

        try {
            const res = await api.post("/users/login/", { username, password });
            const { token, user } = res.data;

            Cookies.set("token", token, { expires: remember ? 7 : undefined });
            Cookies.set("role", user.role.toLowerCase());
            Cookies.set("username", user.username);
            Cookies.set("userId", user.id); // ✅ Add this

            if (remember) {
                localStorage.setItem("rememberUsername", username);
                localStorage.setItem("rememberPassword", password);
            } else {
                localStorage.removeItem("rememberUsername");
                localStorage.removeItem("rememberPassword");
            }

            // Dynamic redirect for any role
            const role = user.role.toLowerCase();
            const validRoles = [
                "ceo",
                "admin",
                "hr",
                "staff",
                "manager",
                "supervisor",
                "collector",
                "driver",
                "customer",
                "accounting",
            ];

            const redirectPath = validRoles.includes(role)
                ? `/dashboard/${role}`
                : "/";

            router.replace(redirectPath);
        } catch (err: any) {
            setError(err.response?.data?.non_field_errors?.[0] || "Invalid credentials or server error.");
        } finally {
            setLoading(false);
        }
    };

    // ------------------- PASSWORD RESET -------------------
    const handleSendResetOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);
        setResetMessage("");

        try {
            await api.post("/password-reset-request/", { email: resetEmail });
            setResetMessage("OTP has been sent to your email.");
            setResetStep(2);
        } catch (err: any) {
            setResetMessage("Email not found or server error.");
        } finally {
            setResetLoading(false);
        }
    };

    const handleConfirmReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setResetMessage("Passwords do not match.");
            return;
        }

        setResetLoading(true);
        try {
            await api.post("/password-reset-confirm/", {
                email: resetEmail,
                otp: resetOtp,
                new_password: newPassword,
            });
            setResetMessage("");
            setSuccessMessage("✅ Password successfully reset! You can now log in.");
            setResetStep(1);
            setResetEmail("");
            setResetOtp("");
            setNewPassword("");
            setConfirmPassword("");
            setShowResetModal(false);
        } catch (err: any) {
            setResetMessage("Invalid OTP or expired code.");
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-800 p-4 relative">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md animate-fadeIn">
                <h1 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-gray-100">
                    Login
                </h1>

                {error && (
                    <div className="bg-red-50 text-red-600 border border-red-200 text-sm p-2 rounded mb-4">
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div className="bg-green-50 text-green-600 border border-green-200 text-sm p-2 rounded mb-4">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                            Username
                        </label>
                        <div className="relative">
                            <FiUser className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                            Password
                        </label>
                        <div className="relative">
                            <FiLock className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                            />
                            <div
                                className="absolute right-3 top-3 cursor-pointer text-gray-400"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                            Remember me
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowResetModal(true)}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Forgot password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                {/* Password Reset Modal */}
                {showResetModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 animate-fadeIn">
                        {/* ...your reset modal code remains unchanged */}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
}
