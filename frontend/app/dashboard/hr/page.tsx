// frontend/app/dashboard/hr/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import { Users, FileText, Calendar, AlertCircle, TrendingUp, Clock } from 'lucide-react';

export default function HRDashboard() {
    const [stats, setStats] = useState({
        totalStaff: 0,
        activeStaff: 0,
        pendingLeaves: 0,
        pendingLoans: 0,
        thisMonthPayroll: 0,
        attendanceRate: 0
    });
    const [recentLeaves, setRecentLeaves] = useState([]);
    const [recentComplaints, setRecentComplaints] = useState([]);
    const [upcomingTasks, setUpcomingTasks] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [staffRes, leaveRes, complaintRes, taskRes] = await Promise.all([
                    api.get('/hr/staff/'),
                    api.get('/hr/leaves/?status=Pending'),
                    api.get('/hr/complaints/?status=Open'),
                    api.get('/hr/tasks/?status=Pending')
                ]);

                setStats({
                    totalStaff: staffRes.data.length,
                    activeStaff: staffRes.data.filter((s: any) => s.status === 'Active').length,
                    pendingLeaves: leaveRes.data.length,
                    pendingLoans: 3,
                    thisMonthPayroll: 1250000,
                    attendanceRate: 94
                });

                setRecentLeaves(leaveRes.data.slice(0, 5));
                setRecentComplaints(complaintRes.data.slice(0, 5));
                setUpcomingTasks(taskRes.data.slice(0, 5));
            } catch (err) {
                console.error(err);
            }
        };

        fetchData();
    }, []);

    return (
        <>
            <div className="min-h-screen bg-gray-50">
                {/* Navbar */}
                <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
                            <Button asChild>
                                <Link href="/dashboard/hr/staff">Manage Staff</Link>
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalStaff}</div>
                                <p className="text-xs text-muted-foreground">{stats.activeStaff} active</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                                <Calendar className="h-4 w-4 text-orange-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{stats.attendanceRate}%</div>
                                <Progress value={stats.attendanceRate} className="mt-2" />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">This Month Payroll</CardTitle>
                                <FileText className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">CFA {stats.thisMonthPayroll.toLocaleString()}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
                                <AlertCircle className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{recentComplaints.length}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                                <Clock className="h-4 w-4 text-purple-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-600">{upcomingTasks.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="leaves" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                            <TabsTrigger value="leaves">Recent Leave Requests</TabsTrigger>
                            <TabsTrigger value="complaints">Open Complaints</TabsTrigger>
                            <TabsTrigger value="tasks">Upcoming Tasks</TabsTrigger>
                        </TabsList>

                        <TabsContent value="leaves">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pending Leave Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {recentLeaves.map((leave: any) => (
                                            <div key={leave.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <Avatar>
                                                        <AvatarFallback>{leave.staff.user.username[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{leave.staff.user.get_full_name || leave.staff.user.username}</p>
                                                        <p className="text-sm text-gray-500">
                                                            {format(new Date(leave.start_date), 'MMM dd')} → {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Badge variant="secondary">Pending</Badge>
                                                    <Button size="sm" variant="outline">Review</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Similar TabsContent for complaints & tasks */}
                    </Tabs>
                </main>
            </div>
        </>
    );
}