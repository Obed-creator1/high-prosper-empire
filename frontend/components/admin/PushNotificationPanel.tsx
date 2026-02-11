// components/admin/PushNotificationPanel.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

export default function PushNotificationPanel() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [url, setUrl] = useState("/dashboard");
    const [target, setTarget] = useState("all");
    const [isSending, setIsSending] = useState(false);

    const predefinedMessages = {
        welcome: {
            title: "Welcome to the Empire 👑",
            message: "Your HIGH PROSPER account is active. Start managing your financial empire today!",
            url: "/dashboard",
        },
        payment: {
            title: "Payment Received 💰",
            message: "A new payment has been recorded in your account. Check your ledger for details.",
            url: "/dashboard/payments",
        },
        task: {
            title: "New Task Assigned 📋",
            message: "You have a new priority task. Check your dashboard to stay ahead.",
            url: "/dashboard/tasks",
        },
        alert: {
            title: "Empire Alert ⚠️",
            message: "Important update: Review your fleet status immediately.",
            url: "/dashboard/fleet",
        },
    };

    const handlePreset = (preset: keyof typeof predefinedMessages) => {
        const data = predefinedMessages[preset];
        setTitle(data.title);
        setMessage(data.message);
        setUrl(data.url);
    };

    const sendNotification = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error("Title and message are required");
            return;
        }

        setIsSending(true);

        try {
            const payload: any = {
                title,
                message,
                url,
            };

            // Target-specific endpoint
            let endpoint = "/notifications/admin/broadcast/";
            if (target !== "all") {
                endpoint = `/notifications/admin/send-to-${target}/`;
            }

            const response = await api.post(endpoint, payload);

            if (response.status === 200 || response.status === 201) {
                toast.success(`🚀 Notification sent successfully to ${target === "all" ? "all users" : target + "s"}!`);
                // Reset form
                setTitle("");
                setMessage("");
                setUrl("/dashboard");
            }
        } catch (err: any) {
            console.error("Failed to send notification:", err);
            toast.error(err.response?.data?.detail || "Failed to send notification");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Card className="w-full max-w-3xl mx-auto bg-gradient-to-br from-gray-900 via-black to-gray-900 border-purple-500/30 shadow-2xl">
            <CardHeader className="text-center">
                <CardTitle className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Empire Broadcast Center
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg mt-2">
                    Send real-time push notifications across the entire HIGH PROSPER ecosystem
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Quick Presets */}
                <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Templates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreset("welcome")}
                            className="border-purple-500/50 hover:bg-purple-500/20"
                        >
                            👋 Welcome
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreset("payment")}
                            className="border-green-500/50 hover:bg-green-500/20"
                        >
                            💰 Payment
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreset("task")}
                            className="border-blue-500/50 hover:bg-blue-500/20"
                        >
                            📋 Task
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreset("alert")}
                            className="border-orange-500/50 hover:bg-orange-500/20"
                        >
                            ⚠️ Alert
                        </Button>
                    </div>
                </div>

                {/* Target Selector */}
                <div>
                    <label className="text-sm font-medium text-gray-300">Send To</label>
                    <Select value={target} onValueChange={setTarget}>
                        <SelectTrigger className="mt-2 bg-gray-800 border-purple-500/30">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="collector">Collectors Only</SelectItem>
                            <SelectItem value="customer">Customers Only</SelectItem>
                            <SelectItem value="driver">Drivers Only</SelectItem>
                            <SelectItem value="admin">Admins Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Title */}
                <div>
                    <label className="text-sm font-medium text-gray-300">Notification Title</label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Payment Received 💰"
                        className="mt-2 bg-gray-800 border-purple-500/30 focus:border-cyan-500"
                        maxLength={65}
                    />
                    <p className="text-xs text-gray-500 mt-1">{title.length}/65 characters</p>
                </div>

                {/* Message */}
                <div>
                    <label className="text-sm font-medium text-gray-300">Message Body</label>
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Your message here..."
                        className="mt-2 bg-gray-800 border-purple-500/30 focus:border-cyan-500 min-h-32"
                        maxLength={180}
                    />
                    <p className="text-xs text-gray-500 mt-1">{message.length}/180 characters</p>
                </div>

                {/* Deep Link URL */}
                <div>
                    <label className="text-sm font-medium text-gray-300">Open Link (on click)</label>
                    <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="/dashboard"
                        className="mt-2 bg-gray-800 border-purple-500/30"
                    />
                </div>

                {/* Send Button */}
                <div className="pt-4">
                    <Button
                        onClick={sendNotification}
                        disabled={isSending || !title || !message}
                        className="w-full py-6 text-lg font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-700 hover:via-pink-700 hover:to-cyan-600 disabled:opacity-60 shadow-xl transform hover:scale-105 transition-all"
                    >
                        {isSending ? (
                            <span className="flex items-center gap-3">
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                Broadcasting to Empire...
              </span>
                        ) : (
                            <span className="flex items-center gap-3">
                <span className="text-2xl">📡</span>
                Send Empire-Wide Alert
              </span>
                        )}
                    </Button>
                </div>

                {/* Info */}
                <div className="text-center text-xs text-gray-500 space-y-1">
                    <p>Notifications are delivered instantly via Web Push</p>
                    <p>Works even when app is closed • Supports Android, iOS, Desktop</p>
                </div>
            </CardContent>
        </Card>
    );
}