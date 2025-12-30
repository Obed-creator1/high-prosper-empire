// app/dashboard/hr/attendance/page.tsx
"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from "date-fns";
import { Clock, UserCheck, AlertCircle, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { toast } from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AttendancePage() {
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
    const [open, setOpen] = useState(false);
    const [clocking, setClocking] = useState<any>(null);

    const { data, mutate } = useSWR(`/api/hr/attendance/?month=${selectedMonth}`, fetcher, {
        refreshInterval: 10000,
    });

    const attendance = data?.results || data || [];

    // === CHART DATA: Last 6 Months Trend ===
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return format(date, "yyyy-MM");
    });

    const monthlyTrend = last6Months.map(month => {
        const monthData = attendance.filter((a: any) => a.date.startsWith(month));
        const daysInMonth = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0).getDate();
        const present = monthData.filter((a: any) => a.status === "present").length;
        const rate = daysInMonth > 0 ? Math.round((present / daysInMonth) * 100) : 0;
        return {
            month: format(new Date(month + "-01"), "MMM yyyy"),
            present,
            late: monthData.filter((a: any) => a.status === "late").length,
            absent: monthData.filter((a: any) => a.status === "absent").length,
            rate,
        };
    });

    // === CURRENT MONTH STATS ===
    const currentMonthDays = new Date(selectedMonth + "-01");
    const totalDays = currentMonthDays.getDate();
    const presentDays = attendance.filter((a: any) => a.status === "present").length;
    const lateDays = attendance.filter((a: any) => a.status === "late").length;
    const absentDays = attendance.filter((a: any) => a.status === "absent").length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // === HEATMAP DATA ===
    const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getHeatmapColor = (date: Date) => {
        const record = attendance.find((a: any) => format(new Date(a.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
        if (!record) return "bg-gray-100 dark:bg-gray-800";
        switch (record.status) {
            case "present": return "bg-green-500";
            case "late": return "bg-yellow-500";
            case "absent": return "bg-red-500";
            default: return "bg-gray-300";
        }
    };

    const handleClock = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = {
            employee: formData.get("employee"),
            date: formData.get("date"),
            clock_in: formData.get("clock_in"),
            clock_out: formData.get("clock_out") || null,
            status: formData.get("status"),
        };

        const method = clocking ? "PUT" : "POST";
        const url = clocking ? `/api/hr/attendance/${clocking.id}/` : "/api/hr/attendance/";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            toast.success(clocking ? "Updated" : "Clocked in");
            mutate();
            setOpen(false);
            setClocking(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Attendance Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-2">Real-time insights, trends, and performance tracking</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="shadow-lg">
                            <UserCheck className="mr-2 h-5 w-5" />
                            Record Attendance
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{clocking ? "Edit" : "New"} Attendance Record</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleClock} className="space-y-4">
                            <div><Label>Employee ID</Label><Input name="employee" defaultValue={clocking?.employee} required /></div>
                            <div><Label>Date</Label><Input type="date" name="date" defaultValue={clocking?.date || format(new Date(), "yyyy-MM-dd")} required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Clock In</Label><Input type="time" name="clock_in" defaultValue={clocking?.clock_in} required /></div>
                                <div><Label>Clock Out</Label><Input type="time" name="clock_out" defaultValue={clocking?.clock_out} /></div>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select name="status" defaultValue={clocking?.status || "present"}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="present">Present</SelectItem>
                                        <SelectItem value="late">Late</SelectItem>
                                        <SelectItem value="absent">Absent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full">{clocking ? "Update" : "Save"}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <Card className="border-green-200 dark:border-green-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Present</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-green-600">{presentDays}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-600" /> {attendanceRate}% rate
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-yellow-200 dark:border-yellow-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Late</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-yellow-600">{lateDays}</div>
                    </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Absent</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-red-600">{absentDays}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">This Month</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Total Days</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{totalDays}</div>
                    </CardContent>
                </Card>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Line Chart: Attendance Rate Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Attendance Rate Trend (6 Months)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} name="Attendance %" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Bar Chart: Present vs Late vs Absent */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Monthly Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="present" fill="#10b981" name="Present" />
                                <Bar dataKey="late" fill="#f59e0b" name="Late" />
                                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Month Selector + Heatmap */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setSelectedMonth(format(subMonths(new Date(selectedMonth + "-01"), 1), "yyyy-MM"))}>
                    ←
                </Button>
                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-56" />
                <Button variant="outline" size="icon" onClick={() => setSelectedMonth(format(addMonths(new Date(selectedMonth + "-01"), 1), "yyyy-MM"))}>
                    →
                </Button>
            </div>

            {/* HEATMAP */}
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Heatmap – {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className="text-center text-sm font-bold py-2">{day}</div>
                        ))}
                        {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                        {days.map(day => (
                            <div
                                key={day.toISOString()}
                                className={`aspect-square rounded-lg flex items-center justify-center text-white font-bold text-sm transition-all hover:scale-125 cursor-pointer ${getHeatmapColor(day)}`}
                                title={format(day, "EEEE, MMMM d")}
                            >
                                {format(day, "d")}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-8 mt-6">
                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-500 rounded"></div><span>Present</span></div>
                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-yellow-500 rounded"></div><span>Late</span></div>
                        <div className="flex items-center gap-2"><div className="w-5 h-5 bg-red-500 rounded"></div><span>Absent</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}