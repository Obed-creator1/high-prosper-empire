// app/dashboard/hr/analytics/page.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { format, startOfYear, endOfYear } from "date-fns";
import {
    DollarSign, TrendingUp, Users, Calendar, Award, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";

import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const YEARS = [2024, 2025, 2026];

export default function SalaryAnalyticsPage() {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const { data: payrolls = [] } = useSWR(`/hr/payroll/?year=${selectedYear}`);
    const { data: staffList = [] } = useSWR("/hr/staff/");

    const staffMap = Object.fromEntries(
        (staffList?.results || staffList).map((s: any) => [s.id, s])
    );

    // Calculations
    const totalGross = payrolls.reduce((s: number, p: any) => s + Number(p.total), 0);
    const totalNet = payrolls.reduce((s: number, p: any) => s + Number(p.net_pay), 0);
    const totalTax = payrolls.reduce((s: number, p: any) => s + Number(p.irpp_tax), 0);
    const totalCNPS = payrolls.reduce((s: number, p: any) => s + Number(p.cnps_employee), 0);
    const totalAdvanceDeducted = payrolls.reduce((s: number, p: any) => s + Number(p.advance_deduction || 0), 0);

    const avgNetSalary = payrolls.length > 0 ? totalNet / payrolls.length : 0;
    const highestPaid = payrolls.reduce((max: any, p: any) =>
        Number(p.net_pay) > Number(max?.net_pay || 0) ? p : max, {}
    );
    const lowestPaid = payrolls.length > 0 ? payrolls.reduce((min: any, p: any) =>
        Number(p.net_pay) < Number(min?.net_pay || Infinity) ? p : min
    ) : null;

    // Monthly trend
    const monthlyData = Array(12).fill(0).map((_, i) => {
        const monthPay = payrolls.filter((p: any) => p.month === i + 1);
        return {
            month: i + 1,
            gross: monthPay.reduce((s: number, p: any) => s + Number(p.total), 0),
            net: monthPay.reduce((s: number, p: any) => s + Number(p.net_pay), 0),
            count: monthPay.length
        };
    });

    const chartOptions = {
        chart: { type: "area", height: 350, toolbar: { show: true } },
        xaxis: { categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] },
        colors: ["#10b981", "#059669"],
        stroke: { curve: "smooth" },
        dataLabels: { enabled: false },
        fill: { opacity: 0.8, type: "gradient" },
        tooltip: { y: { formatter: (val: number) => `${val.toLocaleString()} CFA` } },
        legend: { position: "top" }
    };

    const chartSeries = [
        { name: "Gross Salary", data: monthlyData.map(m => m.gross) },
        { name: "Net Salary", data: monthlyData.map(m => m.net) }
    ];

    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                        Salary Analytics {selectedYear}
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                        Full visibility into payroll costs • Tax burden • Employee compensation trends
                    </p>
                </div>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Total Gross</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{totalGross.toLocaleString()} CFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Total Net Paid</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{totalNet.toLocaleString()} CFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">IRPP Tax</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{totalTax.toLocaleString()} CFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">CNPS Paid</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{totalCNPS.toLocaleString()} CFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Net Salary</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgNetSalary.toFixed(0).toLocaleString()} CFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Advances Recovered</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{totalAdvanceDeducted.toLocaleString()} CFA</div>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Monthly Salary Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <Chart options={chartOptions} series={chartSeries} type="area" height={350} />
                </CardContent>
            </Card>

            {/* Top & Bottom Earners */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Award className="h-6 w-6 text-yellow-600" />
                            Highest Paid Employee
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {highestPaid && (
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-bold text-emerald-600">
                                    {Number(highestPaid.net_pay).toLocaleString()} CFA
                                </div>
                                <div>
                                    <p className="font-medium">{staffMap[highestPaid.staff]?.user?.username}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {staffMap[highestPaid.staff]?.department} • {highestPaid.month}/2025
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-orange-600" />
                            Lowest Paid Employee
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lowestPaid && (
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-bold text-orange-600">
                                    {Number(lowestPaid.net_pay).toLocaleString()} CFA
                                </div>
                                <div>
                                    <p className="font-medium">{staffMap[lowestPaid.staff]?.user?.username}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {staffMap[lowestPaid.staff]?.department} • {lowestPaid.month}/2025
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Department Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Department Salary Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Department</TableHead>
                                <TableHead className="text-right">Employees</TableHead>
                                <TableHead className="text-right">Total Gross</TableHead>
                                <TableHead className="text-right">Total Net</TableHead>
                                <TableHead className="text-right">Avg Net</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(
                                payrolls.reduce((acc: any, p: any) => {
                                    const dept = staffMap[p.staff]?.department || "Unknown";
                                    if (!acc[dept]) acc[dept] = { count: 0, gross: 0, net: 0 };
                                    acc[dept].count += 1;
                                    acc[dept].gross += Number(p.total);
                                    acc[dept].net += Number(p.net_pay);
                                    return acc;
                                }, {})
                            ).map(([dept, data]: [string, any]) => (
                                <TableRow key={dept}>
                                    <TableCell className="font-medium">{dept}</TableCell>
                                    <TableCell className="text-right">{data.count}</TableCell>
                                    <TableCell className="text-right">{data.gross.toLocaleString()} CFA</TableCell>
                                    <TableCell className="text-right font-bold">{data.net.toLocaleString()} CFA</TableCell>
                                    <TableCell className="text-right">{(data.net / data.count).toFixed(0).toLocaleString()} CFA</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}