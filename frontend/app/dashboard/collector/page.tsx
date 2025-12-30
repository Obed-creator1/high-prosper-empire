// app/dashboard/collector/page.tsx — FINAL FIXED VERSION
"use client";

import { useEffect, useState } from "react";
import AnalyticsOverview from "@/components/collector/AnalyticsOverview";
import PerformanceChart from "@/components/collector/PerformanceChart";
import CollectorTable from "@/components/collector/CollectorTable";
import TargetTable from "@/components/collector/TargetTable";
import ScheduleTable from "@/components/collector/ScheduleTable";
import TurnCountTable from "@/components/collector/TurnCountTable";
import TaskTable from "@/components/collector/TaskTable";
import CollectorLocationMap from "@/components/collector/CollectorLocationMap";
import ChatPanel from "@/components/collector/ChatPanel";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function CollectorDashboard() {
    const [stats, setStats] = useState({
        total_collectors: 0,
        active_collectors: 0,
        average_rating: 0,
        average_efficiency: 0,
        total_customers: 0,
    });

    const [trends, setTrends] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, trendsRes] = await Promise.all([
                api.get("/collector/analytics/"),
                api.get("/collector/analytics/trends/"),
            ]);

            setStats(statsRes.data.overview);
            setTrends(trendsRes.data);
        } catch (err) {
            console.error("Failed to load dashboard data:", err);
            toast.error("Failed to load dashboard statistics");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Overview Cards */}
            <AnalyticsOverview />

            {/* Performance Chart */}
            <PerformanceChart />

            {/* Main Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <CollectorTable />
                <TargetTable />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <ScheduleTable />
                <TurnCountTable />
            </div>

            <TaskTable />

            {/* Live GPS Map - No Suspense needed; map handles client-only mount */}
            <CollectorLocationMap />

            {/* Chat Panel */}
            <ChatPanel />
        </div>
    );
}