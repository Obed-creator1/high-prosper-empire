// app/dashboard/settings/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Mail, Smartphone, Volume2, Globe, Zap, CreditCard, Users, MessageSquare, Calendar, AlertTriangle, Info } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import api from "@/lib/api";

interface NotificationSettings {
    notify_realtime: boolean;
    notify_email: boolean;
    notify_sms: boolean;
    notify_browser: boolean;
    notify_sound: boolean;
    notify_payment: boolean;
    notify_customer_update: boolean;
    notify_chat: boolean;
    notify_task: boolean;
    notify_leave: boolean;
    notify_system: boolean;
}

const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function NotificationSettings() {
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get("/users/notification-settings/");
                setSettings(res.data);
            } catch (err) {
                console.error("Failed to load settings:", err);
                toast.error("Could not load notification settings");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleToggle = (key: keyof NotificationSettings, value?: boolean) => {
        if (!settings) return;
        const newValue = value !== undefined ? value : !settings[key];
        setSettings(prev => prev ? { ...prev, [key]: newValue } : null);
    };

    const saveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await api.patch("/users/notification-settings/", settings);
            toast.success("Settings saved successfully");
        } catch (err) {
            console.error("Failed to save settings:", err);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={sectionVariants}
                className="space-y-8"
            >
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Notification Preferences
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Customize how you receive updates from High Prosper
                    </p>
                </div>

                <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-t-xl">
                        <CardTitle className="text-2xl">General Settings</CardTitle>
                        <CardDescription>
                            Control real-time and delivery preferences
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-8">
                        {/* General Toggles */}
                        <motion.div variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { id: "realtime", label: "Real-time Updates", desc: "Instant browser notifications", icon: Zap },
                                { id: "sound", label: "Notification Sound", desc: "Play sound on new alerts", icon: Volume2 },
                                { id: "browser", label: "Browser Push", desc: "Alerts even when tab is closed", icon: Globe },
                            ].map(({ id, label, desc, icon: Icon }) => (
                                <div key={id} className="flex flex-col p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                            <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <Label htmlFor={id} className="text-base font-medium">{label}</Label>
                                            <p className="text-sm text-muted-foreground">{desc}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        id={id}
                                        checked={settings[`notify_${id}` as keyof NotificationSettings]}
                                        onCheckedChange={(checked) => handleToggle(`notify_${id}` as keyof NotificationSettings, checked)}
                                        className="ml-auto"
                                    />
                                </div>
                            ))}
                        </motion.div>

                        {/* Delivery Methods */}
                        <motion.div variants={sectionVariants} className="space-y-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Mail className="h-5 w-5 text-purple-600" />
                                Delivery Methods
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { id: "email", label: "Email", desc: "Important updates via email", icon: Mail },
                                    { id: "sms", label: "SMS", desc: "Urgent alerts via text", icon: Smartphone },
                                ].map(({ id, label, desc, icon: Icon }) => (
                                    <div key={id} className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                                <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <Label htmlFor={id} className="text-base font-medium">{label}</Label>
                                                <p className="text-sm text-muted-foreground">{desc}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            id={id}
                                            checked={settings[`notify_${id}` as keyof NotificationSettings]}
                                            onCheckedChange={(checked) => handleToggle(`notify_${id}` as keyof NotificationSettings, checked)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Notification Types */}
                        <motion.div variants={sectionVariants} className="space-y-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Bell className="h-5 w-5 text-purple-600" />
                                Notification Types
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { key: "notify_payment", label: "Payment Updates", icon: CreditCard },
                                    { key: "notify_customer_update", label: "Customer Updates", icon: Users },
                                    { key: "notify_chat", label: "Chat Messages", icon: MessageSquare },
                                    { key: "notify_task", label: "Task Assignments", icon: AlertTriangle },
                                    { key: "notify_leave", label: "Leave Requests", icon: Calendar },
                                    { key: "notify_system", label: "System Announcements", icon: Info },
                                ].map(({ key, label, icon: Icon }) => (
                                    <div key={key} className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                                <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <Label htmlFor={key} className="text-base font-medium">{label}</Label>
                                        </div>
                                        <Switch
                                            id={key}
                                            checked={settings[key as keyof NotificationSettings]}
                                            onCheckedChange={(checked) => handleToggle(key as keyof NotificationSettings, checked)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-8">
                            <Button
                                size="lg"
                                onClick={saveSettings}
                                disabled={saving}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transform hover:scale-105 transition-all duration-300"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Preferences"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}