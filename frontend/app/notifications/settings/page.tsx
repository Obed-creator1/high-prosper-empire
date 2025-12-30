// app/notifications/settings/page.tsx — THE ULTIMATE NOTIFICATION SETTINGS 2025
"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import {
    Bell, BellOff, Volume2, VolumeX, Smartphone, Globe, Mail,
    MessageSquare, Users, Crown, Settings, ChevronLeft,
    Check, X, Zap, Shield, Clock, Palette, Moon, Sun, CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

interface NotificationPreferences {
    chat_messages: boolean;
    group_messages: boolean;
    mentions: boolean;
    reactions: boolean;
    friend_requests: boolean;
    group_invites: boolean;
    admin_actions: boolean;
    system_updates: boolean;
    sound_enabled: boolean;
    vibration_enabled: boolean;
    push_enabled: boolean;
    email_enabled: boolean;
    desktop_enabled: boolean;
}

export default function NotificationSettingsPage() {
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        chat_messages: true,
        group_messages: true,
        mentions: true,
        reactions: true,
        friend_requests: true,
        group_invites: true,
        admin_actions: true,
        system_updates: false,
        sound_enabled: true,
        vibration_enabled: true,
        push_enabled: true,
        email_enabled: false,
        desktop_enabled: true,
    });

    const [darkMode, setDarkMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("notification-prefs");
        if (saved) {
            setPreferences(JSON.parse(saved));
        }
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") setDarkMode(true);
    }, []);

    const savePreferences = () => {
        setSaving(true);
        localStorage.setItem("notification-prefs", JSON.stringify(preferences));
        localStorage.setItem("theme", darkMode ? "dark" : "light");

        setTimeout(() => {
            setSaving(false);
            alert("Notification settings saved!");
        }, 800);
    };

    const togglePreference = (key: keyof NotificationPreferences) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const PreferenceToggle = ({
                                  icon: Icon,
                                  title,
                                  description,
                                  enabled,
                                  onToggle,
                                  premium = false
                              }: any) => (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-4 transition-all ${
                enabled ? "border-purple-400 ring-4 ring-purple-500/20" : "border-gray-200 dark:border-gray-700"
            }`}
        >
            {premium && (
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl">
                    ⭐ PREMIUM
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className={`p-5 rounded-3xl ${enabled ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"} shadow-2xl`}>
                        <Icon size={40} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold">{title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">{description}</p>
                    </div>
                </div>

                <button
                    onClick={onToggle}
                    className={`relative inline-flex h-16 w-32 items-center rounded-full transition-all duration-300 ${
                        enabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                >
                    <motion.span
                        animate={{ x: enabled ? 56 : 8 }}
                        className="inline-block h-14 w-14 transform rounded-full bg-white shadow-2xl"
                    />
                    <span className="absolute left-8 text-white font-bold text-sm">{enabled ? "ON" : "OFF"}</span>
                </button>
            </div>
        </motion.div>
    );

    return (
        <div className={`min-h-screen ${darkMode ? "dark" : ""} bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:to-black transition-all duration-500`}>
            {/* Header */}
            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-2xl sticky top-0 z-40"
            >
                <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all hover:scale-110">
                            <ChevronLeft size={36} />
                        </button>
                        <div>
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Notification Settings
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                                Control how and when you get notified
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl hover:shadow-xl transition-all hover:scale-110"
                        >
                            {darkMode ? <Sun size={28} className="text-yellow-400" /> : <Moon size={28} className="text-purple-600" />}
                        </button>

                        <button
                            onClick={savePreferences}
                            disabled={saving}
                            className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-2xl hover:shadow-3xl transition-all hover:scale-105 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : (
                                <>
                                    <Check size={28} />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
                {/* Notification Types */}
                <div>
                    <h2 className="text-4xl font-bold mb-10 flex items-center gap-4">
                        <Bell size={48} className="text-purple-600" />
                        Notification Types
                    </h2>
                    <div className="space-y-6">
                        <PreferenceToggle
                            icon={MessageSquare}
                            title="Direct Messages"
                            description="Get notified when someone sends you a private message"
                            enabled={preferences.chat_messages}
                            onToggle={() => togglePreference("chat_messages")}
                        />
                        <PreferenceToggle
                            icon={Users}
                            title="Group Messages"
                            description="Notifications for group chats you're in"
                            enabled={preferences.group_messages}
                            onToggle={() => togglePreference("group_messages")}
                        />
                        <PreferenceToggle
                            icon={Zap}
                            title="Mentions & Replies"
                            description="When someone @mentions you or replies to your message"
                            enabled={preferences.mentions}
                            onToggle={() => togglePreference("mentions")}
                        />
                        <PreferenceToggle
                            icon={CheckCircle2}
                            title="Reactions"
                            description="When someone reacts to your messages"
                            enabled={preferences.reactions}
                            onToggle={() => togglePreference("reactions")}
                        />
                        <PreferenceToggle
                            icon={Crown}
                            title="Admin Actions"
                            description="Group promotions, removals, and important admin events"
                            enabled={preferences.admin_actions}
                            premium={true}
                            onToggle={() => togglePreference("admin_actions")}
                        />
                    </div>
                </div>

                {/* Delivery Methods */}
                <div>
                    <h2 className="text-4xl font-bold mb-10 flex items-center gap-4">
                        <Smartphone size={48} className="text-indigo-600" />
                        Delivery Methods
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PreferenceToggle
                            icon={Bell}
                            title="Push Notifications"
                            description="Show notifications even when app is closed"
                            enabled={preferences.push_enabled}
                            onToggle={() => togglePreference("push_enabled")}
                        />
                        <PreferenceToggle
                            icon={Volume2}
                            title="Sound Effects"
                            description="Play beautiful sounds for different notification types"
                            enabled={preferences.sound_enabled}
                            onToggle={() => togglePreference("sound_enabled")}
                        />
                        <PreferenceToggle
                            icon={Zap}
                            title="Vibration"
                            description="Feel different haptic patterns for each notification"
                            enabled={preferences.vibration_enabled}
                            onToggle={() => togglePreference("vibration_enabled")}
                        />
                        <PreferenceToggle
                            icon={Mail}
                            title="Email Notifications"
                            description="Get important updates via email"
                            enabled={preferences.email_enabled}
                            premium={true}
                            onToggle={() => togglePreference("email_enabled")}
                        />
                    </div>
                </div>

                {/* Do Not Disturb */}
                <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border-4 border-red-300 dark:border-red-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="p-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl text-white shadow-2xl">
                                <BellOff size={48} />
                            </div>
                            <div>
                                <h3 className="text-4xl font-bold text-red-600 dark:text-red-400">Do Not Disturb</h3>
                                <p className="text-xl text-gray-600 dark:text-gray-400 mt-3">
                                    Silence all notifications temporarily
                                </p>
                            </div>
                        </div>
                        <button className="px-10 py-6 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-2xl font-bold text-2xl shadow-2xl hover:shadow-3xl transition-all hover:scale-105">
                            Enable DND
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-3xl shadow-2xl font-bold text-xl"
                    >
                        <VolumeX size={48} className="mx-auto mb-3" />
                        Mute All
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-8 bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-3xl shadow-2xl font-bold text-xl"
                    >
                        <Check size={48} className="mx-auto mb-3" />
                        Mark All Read
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-8 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-3xl shadow-2xl font-bold text-xl"
                    >
                        <Settings size={48} className="mx-auto mb-3" />
                        Advanced
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-8 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-3xl shadow-2xl font-bold text-xl"
                    >
                        <Shield size={48} className="mx-auto mb-3" />
                        Privacy
                    </motion.button>
                </div>
            </div>
        </div>
    );
}