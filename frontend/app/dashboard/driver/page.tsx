"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

import Sidebar from "../../../components/Sidebar";
import StatsCard from "../../../components/StatsCard";
import api from "../../../lib/api";

type DriverStats = {
  totalTrips: number;
  completedTrips: number;
  pendingTrips: number;
};

export default function DriverDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DriverStats>({
    totalTrips: 0,
    completedTrips: 0,
    pendingTrips: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = Cookies.get("token");
    const role = Cookies.get("role");

    if (!token || role !== "driver") {
      router.push("/login");
      return;
    }

    fetchStats(token);
  }, []);

  const fetchStats = async (token: string) => {
    try {
      const res = await api.get<DriverStats>("/users/driver/stats/", {
        headers: { Authorization: `Token ${token}` },
      });
      setStats(res.data);
    } catch (err: any) {
      console.error("Failed to fetch driver stats:", err);
      setError("Failed to load stats.");
    } finally {
      setLoading(false);
    }
  };

  if (!Cookies.get("token") || loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6">Driver Dashboard</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard title="Total Trips" value={stats.totalTrips} color={undefined} />
          <StatsCard title="Completed Trips" value={stats.completedTrips} color={undefined} />
          <StatsCard title="Pending Trips" value={stats.pendingTrips} color={undefined} />
        </div>
      </main>
    </div>
  );
}
