"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FiLock, FiMail, FiCheckCircle } from "react-icons/fi";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/api/password-reset/confirm/", {
        email,
        otp,
        new_password: newPassword,
      });

      setSuccess(true);
      setMessage(res.data.message || "Password reset successfully!");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setMessage("Invalid OTP, email, or server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 relative overflow-hidden">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl p-8 z-10 animate-fadeIn">
        <div className="flex flex-col items-center mb-6">
          {success ? (
            <FiCheckCircle className="w-14 h-14 text-green-600 mb-3 animate-bounce" />
          ) : (
            <FiLock className="w-14 h-14 text-blue-600 mb-3 animate-pulse" />
          )}
          <h2 className="text-3xl font-bold text-gray-800 text-center">
            {success ? "Success!" : "Reset Password 🔒"}
          </h2>
          <p className="text-gray-600 text-center mt-1">
            {success
              ? "Redirecting to login..."
              : "Enter your email, OTP, and new password"}
          </p>
        </div>

        {message && (
          <p
            className={`text-center mb-4 py-2 rounded-lg font-medium ${
              success
                ? "text-green-700 bg-green-100"
                : "text-red-600 bg-red-100 animate-shake"
            }`}
          >
            {message}
          </p>
        )}

        {!success && (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-1 font-medium">OTP</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter OTP or reset code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                New Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
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
          animation: fadeIn 0.6s ease-in-out;
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-5px);
          }
          40%,
          80% {
            transform: translateX(5px);
          }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
