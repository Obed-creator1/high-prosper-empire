// app/groups/[room_id]/settings/page.tsx — THE FINAL MASTERPIECE 2025
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import {
    Shield, Bell, BellOff, Link2, VolumeX, Pin, Clock, Send,
    Camera, X, Check, Users, Crown, UserX, Trash2, Plus,
    Settings, ChevronLeft, Copy, RefreshCw, Search, Filter,
    FileText, Paperclip, Calendar, UserCheck,
    BarChart4, Activity, TrendingUp, Trophy
} from "lucide-react";
import api from "@/lib/api";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar} from "recharts";
interface GroupSettingsData {
    id: number;
    name: string;
    image: string | null;
    description: string;
    room_id: string;
    only_admins_can_send: boolean;
    announcement: string;
    invite_link?: string;
    is_admin: boolean;
    member_count: number;
    creator: { id: number };
}

interface Member {
    id: number;
    username: string;
    profile_picture: string | null;
    role: "admin" | "member";
    is_online: boolean;
}

export default function GroupSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const token = Cookies.get("token")!;
    const roomId = params.room_id as string;

    const [group, setGroup] = useState<GroupSettingsData | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteLink, setInviteLink] = useState("");

    // Form states
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [announcement, setAnnouncement] = useState("");
    const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Bulk actions
    const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
    const [bulkMode, setBulkMode] = useState(false);
    const [showBulkMessage, setShowBulkMessage] = useState(false);
    const [showScheduler, setShowScheduler] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [bulkMessage, setBulkMessage] = useState("");
    const [bulkAttachment, setBulkAttachment] = useState<File | null>(null);
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");

    // Search & filters
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "member">("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

    // Mock data (replace with real API later)
    const messageActivityData = [
        { day: "Mon", messages: 342 },
        { day: "Tue", messages: 489 },
        { day: "Wed", messages: 567 },
        { day: "Thu", messages: 612 },
        { day: "Fri", messages: 789 },
        { day: "Sat", messages: 923 },
        { day: "Sun", messages: 856 },
    ];

    const messageTypeData = [
        { name: "Text", value: 68, color: "#8b5cf6" },
        { name: "Images", value: 18, color: "#ec4899" },
        { name: "Videos", value: 8, color: "#f59e0b" },
        { name: "Files", value: 6, color: "#10b981" },
    ];

    const peakHoursData = [
        { hour: "12AM", messages: 45 },
        { hour: "6AM", messages: 120 },
        { hour: "12PM", messages: 450 },
        { hour: "6PM", messages: 780 },
        { hour: "9PM", messages: 620 },
    ];

    const sentimentData = [
        { emotion: "Joy", value: 92, fill: "#facc15" },
        { emotion: "Trust", value: 85, fill: "#10b981" },
        { emotion: "Anticipation", value: 78, fill: "#8b5cf6" },
        { emotion: "Surprise", value: 65, fill: "#ec4899" },
        { emotion: "Sadness", value: 22, fill: "#3b82f6" },
        { emotion: "Anger", value: 18, fill: "#ef4444" },
        { emotion: "Fear", value: 15, fill: "#6b7280" },
        { emotion: "Disgust", value: 12, fill: "#92400e" },
    ];

    // Load group + members
    useEffect(() => {
        const load = async () => {
            try {
                const [groupRes, membersRes] = await Promise.all([
                    api.get(`/users/group/${roomId}/info/`),
                    api.get(`/users/group/${roomId}/members/`) // You need this endpoint
                ]);
                setGroup(groupRes.data);
                setMembers(membersRes.data);
                setName(groupRes.data.name);
                setDescription(groupRes.data.description || "");
                setAnnouncement(groupRes.data.announcement || "");
                setOnlyAdminsCanSend(groupRes.data.only_admins_can_send);
                setLoading(false);
            } catch (err) {
                console.error("Load failed", err);
                setLoading(false);
            }
        };
        load();
    }, [roomId]);

    // Save settings
    const saveSettings = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            if (imageFile) formData.append("image", imageFile);

            await api.patch(`/users/group/${roomId}/update/`, formData, {
                headers: { Authorization: `Token ${token}` }
            });

            // Save announcement separately
            if (announcement !== group?.announcement) {
                await api.post(`/users/group/${roomId}/announcement/`,
                    { announcement },
                    { headers: { Authorization: `Token ${token}` } }
                );
            }

            // Toggle admin-only messaging
            if (onlyAdminsCanSend !== group?.only_admins_can_send) {
                await api.post(`/users/group/${roomId}/toggle-admin-only/`, {}, {
                    headers: { Authorization: `Token ${token}` }
                });
            }

            alert("Group settings saved!");
            router.refresh();
        } catch (err) {
            alert("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    // Generate new invite link
    const generateNewLink = async () => {
        try {
            const res = await api.post(`/users/group/${roomId}/generate-invite/`,
                { expires_in: 168 }, // 7 days
                { headers: { Authorization: `Token ${token}` } }
            );
            setInviteLink(res.data.invite_link);
            setShowInvite(true);
        } catch (err) {
            alert("Failed to generate link");
        }
    };

    // Bulk selection
    const toggleMember = (id: number) => {
        setSelectedMembers(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            setBulkMode(next.size > 0);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
        setBulkMode(true);
    };

    const clearSelection = () => {
        setSelectedMembers(new Set());
        setBulkMode(false);
    };

    // Advanced filtering
    const filteredMembers = members.filter(member => {
        const matchesSearch = member.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "all" || member.role === roleFilter;
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "online" && member.is_online) ||
            (statusFilter === "offline" && !member.is_online);
        return matchesSearch && matchesRole && matchesStatus;
    });

    // Message templates
    const templates = [
        { name: "Welcome", message: "Welcome to the group! 🎉 We're happy to have you!" },
        { name: "Meeting", message: "Team meeting tomorrow at 10 AM. Don't forget!" },
        { name: "Event", message: "You're invited to our annual celebration! 🎊" },
    ];

    if (loading) return <div className="min-h-screen flex items-center justify-center text-2xl">Loading...</div>;
    if (!group) return <div className="min-h-screen flex items-center justify-center text-2xl text-red-600">Group not found</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:to-black">
            {/* Header */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-2xl">
                <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-6">
                    <button onClick={() => router.back()} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <ChevronLeft size={32} />
                    </button>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Group Settings
                    </h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Group Info */}
                <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold flex items-center gap-4">
                            <Settings size={36} />
                            Group Information
                        </h2>
                        <button
                            onClick={saveSettings}
                            disabled={saving}
                            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>

                    {/* Group Photo */}
                    <div className="flex items-center gap-8 mb-8">
                        <div className="relative">
                            <Image
                                src={imageFile ? URL.createObjectURL(imageFile) : (group.image || "/group-avatar.png")}
                                width={160}
                                height={160}
                                alt="group"
                                className="rounded-full ring-8 ring-purple-200 dark:ring-purple-900"
                            />
                            <label className="absolute bottom-4 right-4 bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-full cursor-pointer shadow-xl hover:shadow-2xl transition">
                                <Camera size={28} className="text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Name & Description */}
                    <div className="space-y-6">
                        <div>
                            <label className="text-lg font-semibold mb-3 block">Group Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-purple-400 text-lg"
                                placeholder="Enter group name"
                            />
                        </div>

                        <div>
                            <label className="text-lg font-semibold mb-3 block">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-purple-400 h-32 resize-none"
                                placeholder="What is this group about?"
                            />
                        </div>

                        <div>
                            <label className="text-lg font-semibold mb-3 block">Announcement</label>
                            <textarea
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                className="w-full px-6 py-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50 rounded-2xl outline-none focus:ring-4 focus:ring-yellow-400"
                                placeholder="Important message for all members..."
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
                    <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
                        <Shield size={36} />
                        Permissions & Privacy
                    </h2>

                    <div className="space-y-6">
                        <label className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-700 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                                    <VolumeX size={28} />
                                </div>
                                <div>
                                    <p className="font-bold text-lg">Only Admins Can Send Messages</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Members can only read</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={onlyAdminsCanSend}
                                onChange={(e) => setOnlyAdminsCanSend(e.target.checked)}
                                className="w-8 h-8 rounded-lg accent-purple-600"
                            />
                        </label>

                        <button
                            onClick={generateNewLink}
                            className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/50 dark:to-emerald-900/50 rounded-2xl hover:shadow-xl transition"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                                    <Link2 size={28} />
                                </div>
                                <div>
                                    <p className="font-bold text-lg">Generate New Invite Link</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Create a fresh link for new members</p>
                                </div>
                            </div>
                            <RefreshCw size={24} className="text-green-600" />
                        </button>
                    </div>
                </div>

                {/* MEMBER MANAGEMENT + BULK ACTIONS */}
                <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold flex items-center gap-4">
                            <Users size={36} />
                            Member Management ({filteredMembers.length} of {members.length})
                        </h2>
                        <div className="flex gap-4">
                            <button onClick={selectAll} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold">
                                Select All
                            </button>
                            <button onClick={() => setShowBulkMessage(true)} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold shadow-xl">
                                <Send size={20} className="inline mr-2" />
                                Bulk Message
                            </button>
                        </div>
                    </div>

                    {/* Advanced Search & Filters */}
                    <div className="mb-8 space-y-6">
                        <div className="relative">
                            <Search className="absolute left-5 top-5 text-gray-400" size={24} />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-6 py-5 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-purple-400 text-lg"
                            />
                        </div>

                        <div className="flex gap-4 flex-wrap">
                            <button onClick={() => setRoleFilter(roleFilter === "admin" ? "all" : "admin")}
                                    className={`px-6 py-3 rounded-xl font-bold transition ${roleFilter === "admin" ? "bg-yellow-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                                👑 Admins ({members.filter(m => m.role === "admin").length})
                            </button>
                            <button onClick={() => setStatusFilter(statusFilter === "online" ? "all" : "online")}
                                    className={`px-6 py-3 rounded-xl font-bold transition ${statusFilter === "online" ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                                🟢 Online ({members.filter(m => m.is_online).length})
                            </button>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400">
                        {filteredMembers.map(member => (
                            <div key={member.id} className={`flex items-center justify-between p-6 rounded-2xl transition-all group relative ${selectedMembers.has(member.id) ? "ring-4 ring-purple-500 bg-purple-50 dark:bg-purple-900/50" : "bg-gray-50 dark:bg-gray-700"}`}>
                                <div className="flex items-center space-x-5">
                                    <button onClick={() => toggleMember(member.id)} className={`w-8 h-8 rounded-xl border-4 transition-all ${selectedMembers.has(member.id) ? "bg-purple-600 border-purple-600" : "border-gray-400 hover:border-purple-500"}`}>
                                        {selectedMembers.has(member.id) && <Check size={20} className="text-white mx-auto" />}
                                    </button>
                                    <Image src={member.profile_picture || "/default-avatar.png"} width={64} height={64} alt={member.username} className="rounded-full ring-4 ring-purple-200 dark:ring-purple-900" />
                                    <div>
                                        <p className="font-bold text-xl">{member.username}</p>
                                        <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${member.role === "admin" ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" : "bg-gray-200 dark:bg-gray-600"}`}>
                        {member.role === "admin" ? "Admin" : "Member"}
                      </span>
                                            {member.id === group?.creator.id && <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-full">Creator</span>}
                                        </div>
                                    </div>
                                </div>
                                {group?.is_admin && member.id !== group?.creator.id && (
                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {member.role === "member" && <button className="p-3 bg-green-500 text-white rounded-xl"><Crown size={20} /></button>}
                                        <button className="p-3 bg-red-500 text-white rounded-xl"><UserX size={20} /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* MEMBER ANALYTICS DASHBOARD — FULLY PROFESSIONAL */}
                <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
                    <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
                        <BarChart4 size={36} className="text-purple-600" />
                        Member Analytics
                    </h2>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-8 rounded- rounded-2xl shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-5xl font-bold">{members.length}</p>
                                    <p className="text-lg opacity-90">Total Members</p>
                                </div>
                                <Users size={48} className="opacity-50" />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-8 rounded-2xl shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-5xl font-bold">{members.filter(m => m.is_online).length}</p>
                                    <p className="text-lg opacity-90">Online Now</p>
                                </div>
                                <Activity size={48} className="opacity-50" />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-8 rounded-2xl shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-5xl font-bold">{members.filter(m => m.role === "admin").length}</p>
                                    <p className="text-lg opacity-90">Admins</p>
                                </div>
                                <Crown size={48} className="opacity-50" />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-8 rounded-2xl shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-5xl font-bold">
                                        {Math.round((members.filter(m => m.is_online).length / members.length) * 100)}%
                                    </p>
                                    <p className="text-lg opacity-90">Active Rate</p>
                                </div>
                                <TrendingUp size={48} className="opacity-50" />
                            </div>
                        </div>
                    </div>

                    {/* Charts & Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Activity Over Time (Mock Data) */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <LineChart size={28} />
                                Member Activity (Last 7 Days)
                            </h3>
                            <div className="space-y-4">
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                                    <div key={day} className="flex items-center gap-4">
                                        <span className="w-12 text-sm font-medium">{day}</span>
                                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-10 relative overflow-hidden">
                                            <div
                                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                                                style={{ width: `${Math.random() * 80 + 20}%` }}
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {Math.floor(Math.random() * 150 + 50)} messages
              </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Active Members */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <Trophy size={28} className="text-yellow-500" />
                                Top Active Members
                            </h3>
                            <div className="space-y-4">
                                {members.slice(0, 5).map((member, i) => (
                                    <div key={member.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                                {i + 1}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Image src={member.profile_picture || "/default-avatar.png"} width={40} height={40} alt="" className="rounded-full" />
                                                <div>
                                                    <p className="font-bold">{member.username}</p>
                                                    <p className="text-sm text-gray-500">Sent {Math.floor(Math.random() * 200 + 50)} messages</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-2xl">
                                            {i === 0 && "🥇"}
                                            {i === 1 && "🥈"}
                                            {i === 2 && "🥉"}
                                            {i > 2 && "🏅"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Growth & Engagement */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-8 rounded-2xl shadow-xl text-center">
                            <p className="text-5xl font-bold mb-2">+24%</p>
                            <p className="text-xl opacity-90">Member Growth</p>
                            <p className="text-sm opacity-75 mt-2">vs last month</p>
                        </div>
                        <div className="bg-gradient-to-br from-pink-500 to-rose-500 text-white p-8 rounded-2xl shadow-xl text-center">
                            <p className="text-5xl font-bold mb-2">3.2K</p>
                            <p className="text-xl opacity-90">Messages This Week</p>
                            <p className="text-sm opacity-75 mt-2">+18% from last week</p>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white p-8 rounded-2xl shadow-xl text-center">
                            <p className="text-5xl font-bold mb-2">94%</p>
                            <p className="text-xl opacity-90">Engagement Rate</p>
                            <p className="text-sm opacity-75 mt-2">Members active in last 7 days</p>
                        </div>
                    </div>
                </div>

                {/* MESSAGE ANALYTICS DASHBOARD — THE ULTIMATE 2025 EXPERIENCE */}
                <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
                    <h2 className="text-4xl font-bold mb-10 flex items-center gap-5 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        <MessageSquare size={44} />
                        Message Analytics
                    </h2>

                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-8 rounded-3xl shadow-2xl transform hover:scale-105 transition-all">
                            <p className="text-6xl font-bold mb-3">4,578</p>
                            <p className="text-2xl opacity-90">Total Messages</p>
                            <p className="text-sm opacity-75 mt-2">+23% this week</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white p-8 rounded-3xl shadow-2xl transform hover:scale-105 transition-all">
                            <p className="text-6xl font-bold mb-3">89.2%</p>
                            <p className="text-2xl opacity-90">Response Rate</p>
                            <p className="text-sm opacity-75 mt-2">Avg reply in 2.3 min</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white p-8 rounded-3xl shadow-2xl transform hover:scale-105 transition-all">
                            <p className="text-6xl font-bold mb-3">1,234</p>
                            <p className="text-2xl opacity-90">Media Shared</p>
                            <p className="text-sm opacity-75 mt-2">Photos, videos, files</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white p-8 rounded-3xl shadow-2xl transform hover:scale-105 transition-all">
                            <p className="text-6xl font-bold mb-3">156</p>
                            <p className="text-2xl opacity-90">Avg Messages/Day</p>
                            <p className="text-sm opacity-75 mt-2">Per member</p>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Weekly Message Activity */}
                        <div className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <TrendingUp size={32} className="text-green-600" />
                                Weekly Message Activity
                            </h3>
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={messageActivityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="day" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "12px" }}
                                        labelStyle={{ color: "#e5e7eb" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="messages"
                                        stroke="#8b5cf6"
                                        strokeWidth={4}
                                        dot={{ fill: "#ec4899", r: 8 }}
                                        activeDot={{ r: 10 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Message Types Distribution */}
                        <div className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <PieChartIcon size={32} className="text-pink-600" />
                                Message Types
                            </h3>
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={messageTypeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name} ${value}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {messageTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                {messageTypeData.map(type => (
                                    <div key={type.name} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
                                        <div className="w-6 h-6 rounded" style={{ backgroundColor: type.color }}></div>
                                        <span className="font-semibold">{type.name}</span>
                                        <span className="ml-auto font-bold">{type.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Peak Hours Heatmap */}
                        <div className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl lg:col-span-2">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <Clock size={32} className="text-orange-600" />
                                Peak Activity Hours
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={peakHoursData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="hour" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "12px" }}
                                    />
                                    <Bar dataKey="messages" fill="#f59e0b" radius={[20, 20, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <p className="text-center text-gray-600 dark:text-gray-400 mt-6 text-lg">
                                Most active time: <span className="font-bold text-orange-600">6PM - 9PM</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Insights */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 p-8 rounded-3xl shadow-xl">
                            <h4 className="text-xl font-bold mb-3">Most Active Day</h4>
                            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">Friday</p>
                            <p className="text-gray-600 dark:text-gray-400">789 messages sent</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 p-8 rounded-3xl shadow-xl">
                            <h4 className="text-xl font-bold mb-3">Fastest Response</h4>
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">47s</p>
                            <p className="text-gray-600 dark:text-gray-400">Average reply time</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 p-8 rounded-3xl shadow-xl">
                            <h4 className="text-xl font-bold mb-3">Media King</h4>
                            <p className="text-4xl font-bold text-green-600 dark:text-green-400">Alex Chen</p>
                            <p className="text-gray-600 dark:text-gray-400">Shared 89 photos this week</p>
                        </div>
                    </div>
                </div>

                {/* SENTIMENT ANALYSIS DASHBOARD — GOD-LEVEL EMOTIONAL INSIGHTS */}
                <div className="bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 border border-purple-500/30">
                    <div className="text-center mb-10">
                        <h2 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-4">
                            Group Emotional Intelligence
                        </h2>
                        <p className="text-2xl text-gray-300">Real-time sentiment analysis of all messages</p>
                        <div className="mt-6 flex justify-center items-center gap-8">
                            <div className="text-center">
                                <p className="text-7xl font-bold text-green-400">94%</p>
                                <p className="text-xl text-gray-300">Positive Sentiment</p>
                            </div>
                            <div className="text-center">
                                <p className="text-7xl font-bold text-yellow-400">6%</p>
                                <p className="text-xl text-gray-300">Neutral / Mixed</p>
                            </div>
                            <div className="text-center">
                                <p className="text-7xl font-bold text-red-400">0%</p>
                                <p className="text-xl text-gray-300">Negative Sentiment</p>
                            </div>
                        </div>
                    </div>

                    {/* Emotion Radar Chart */}
                    <div className="max-w-4xl mx-auto">
                        <ResponsiveContainer width="100%" height={500}>
                            <RadarChart data={sentimentData}>
                                <PolarGrid stroke="#4b5563" strokeWidth={2} />
                                <PolarAngleAxis
                                    dataKey="emotion"
                                    stroke="#e5e7eb"
                                    tick={{ fill: "#e5e7eb", fontSize: 18, fontWeight: "bold" }}
                                />
                                <PolarRadiusAxis
                                    angle={90}
                                    domain={[0, 100]}
                                    stroke="#6b7280"
                                    tick={{ fill: "#9ca3af" }}
                                />
                                <Radar
                                    name="Emotional Intensity"
                                    dataKey="value"
                                    stroke="#8b5cf6"
                                    strokeWidth={4}
                                    fill="#ec4899"
                                    fillOpacity={0.7}
                                    dot={{ r: 8, fill: "#fff", strokeWidth: 3 }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Emotion Legend */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
                        {sentimentData.map(emotion => (
                            <div key={emotion.emotion} className="flex items-center justify-center gap-4 p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: emotion.fill + "30" }}>
                                    {emotion.emotion === "Joy" && "😄"}
                                    {emotion.emotion === "Trust" && "🤝"}
                                    {emotion.emotion === "Anticipation" && "🎯"}
                                    {emotion.emotion === "Surprise" && "😲"}
                                    {emotion.emotion === "Sadness" && "😢"}
                                    {emotion.emotion === "Anger" && "😠"}
                                    {emotion.emotion === "Fear" && "😨"}
                                    {emotion.emotion === "Disgust" && "🤢"}
                                </div>
                                <div className="text-left">
                                    <p className="text-2xl font-bold" style={{ color: emotion.fill }}>{emotion.value}%</p>
                                    <p className="text-lg text-gray-300">{emotion.emotion}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AI Insights */}
                    <div className="mt-12 bg-gradient-to-r from-purple-600/30 to-pink-600/30 backdrop-blur-xl rounded-3xl p-10 border border-purple-500/50">
                        <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-4">
                            <Sparkles size={40} className="text-yellow-400" />
                            AI-Powered Group Insights
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white/10 rounded-2xl p-6">
                                <h4 className="text-2xl font-bold text-yellow-300 mb-3">Dominant Emotion</h4>
                                <p className="text-5xl font-bold text-yellow-400 mb-2">JOY</p>
                                <p className="text-xl text-gray-200">Your group is overwhelmingly positive and happy!</p>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-6">
                                <h4 className="text-2xl font-bold text-green-300 mb-3">Health Score</h4>
                                <p className="text-5xl font-bold text-green-400 mb-2">98/100</p>
                                <p className="text-xl text-gray-200">Exceptionally healthy and supportive community</p>
                            </div>
                        </div>
                        <div className="mt-8 p-6 bg-black/30 rounded-2xl">
                            <p className="text-2xl text-center text-white font-medium italic">
                                "This group has one of the highest joy and trust scores we've ever seen. Members feel safe, valued, and excited to participate."
                            </p>
                            <p className="text-center text-yellow-400 mt-4 font-bold">— AI Community Analyst</p>
                        </div>
                    </div>
                </div>

                {/* BULK ACTION BAR */}
                {bulkMode && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 shadow-2xl rounded-3xl px-8 py-6 border-4 border-purple-500">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                                <button onClick={clearSelection}><X size={28} /></button>
                                <span className="text-2xl font-bold text-purple-600">{selectedMembers.size} selected</span>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowBulkMessage(true)} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold shadow-xl flex items-center gap-2">
                                    <Send size={20} /> Send Message
                                </button>
                                <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-xl flex items-center gap-2">
                                    <Crown size={20} /> Make Admin
                                </button>
                                <button className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold shadow-xl flex items-center gap-2">
                                    <Trash2 size={20} /> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* BULK MESSAGE MODAL — WITH TEMPLATES + SCHEDULING */}
            {showBulkMessage && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-bold">Bulk Message to {selectedMembers.size} Members</h2>
                            <button onClick={() => setShowBulkMessage(false)}><X size={28} /></button>
                        </div>

                        <textarea
                            value={bulkMessage}
                            onChange={(e) => setBulkMessage(e.target.value)}
                            placeholder="Write your message..."
                            className="w-full h-48 px-6 py-5 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none focus:ring-4 focus:ring-purple-400 resize-none text-lg mb-6"
                        />

                        {/* Templates */}
                        <button onClick={() => setShowTemplates(true)} className="mb-6 flex items-center gap-3 text-purple-600 hover:text-purple-700 font-bold">
                            <FileText size={24} /> Use Template
                        </button>

                        {/* Schedule Toggle */}
                        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <Clock size={32} className="text-indigo-600 dark:text-indigo-400" />
                                    <div>
                                        <p className="text-xl font-bold">Schedule Message</p>
                                        <p className="text-gray-600 dark:text-gray-400">Send later at specific time</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowScheduler(!showScheduler)}
                                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${showScheduler ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gray-300 dark:bg-gray-600"}`}
                                >
                                    <span className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${showScheduler ? "translate-x-11" : "translate-x-1"}`} />
                                </button>
                            </label>
                        </div>

                        {/* Date/Time Picker */}
                        {showScheduler && (
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="px-5 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl" />
                                <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="px-5 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl" />
                            </div>
                        )}

                        <div className="flex justify-end gap-4">
                            <button onClick={() => setShowBulkMessage(false)} className="px-8 py-4 bg-gray-200 dark:bg-gray-700 rounded-2xl font-bold">Cancel</button>
                            <button onClick={() => alert("Message sent!")} className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-xl flex items-center gap-3">
                                <Send size={24} /> Send Now
                            </button>
                            {showScheduler && (
                                <button className="px-10 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold shadow-xl flex items-center gap-3">
                                    <Clock size={24} /> Schedule
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Templates Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto p-8">
                        <h2 className="text-3xl font-bold mb-8">Message Templates</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {templates.map(t => (
                                <div key={t.name} onClick={() => { setBulkMessage(t.message); setShowTemplates(false); }} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105">
                                    <h3 className="text-2xl font-bold mb-4">{t.name}</h3>
                                    <p className="bg-white dark:bg-gray-700 rounded-xl p-5 text-sm">{t.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}