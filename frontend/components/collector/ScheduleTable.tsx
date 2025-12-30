// components/collector/ScheduleTable.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function ScheduleTable() {
    const [schedules, setSchedules] = useState<any[] | null>(null); // ← null until loaded
    const [filteredSchedules, setFilteredSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [dayFilter, setDayFilter] = useState("all");
    const [weekFilter, setWeekFilter] = useState("all");
    const [yearFilter, setYearFilter] = useState("all");
    const [completedFilter, setCompletedFilter] = useState("all");

    // Sorting
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: "asc" | "desc";
    } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            const res = await api.get("/collector/schedules/");
            const data = Array.isArray(res.data) ? res.data : [];
            setSchedules(data);
            setFilteredSchedules(data);
        } catch (err) {
            toast.error("Failed to load schedules");
            setSchedules([]); // Fallback to empty array
        } finally {
            setLoading(false);
        }
    };

    // Apply filters, search, sorting & pagination
    const processedSchedules = useMemo(() => {
        // Safeguard: if schedules is null or undefined, return empty array
        if (!schedules) return [];

        let result = [...schedules];

        // Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter((s) =>
                s.village.name?.toLowerCase().includes(lowerSearch) ||
                s.collector?.user?.toLowerCase().includes(lowerSearch) ||
                s.vehicle?.number_plate?.toLowerCase().includes(lowerSearch)
            );
        }

        // Day of Week
        if (dayFilter !== "all") {
            result = result.filter((s) => s.day_of_week === parseInt(dayFilter));
        }

        // Week Number
        if (weekFilter !== "all") {
            result = result.filter((s) => s.week_number === parseInt(weekFilter));
        }

        // Year
        if (yearFilter !== "all") {
            result = result.filter((s) => s.year === parseInt(yearFilter));
        }

        // Completed Status
        if (completedFilter !== "all") {
            const isCompleted = completedFilter === "completed";
            result = result.filter((s) => s.is_completed === isCompleted);
        }

        // Sorting
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }

        // Pagination
        const total = result.length;
        setTotalPages(Math.ceil(total / pageSize));
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return result.slice(start, end);
    }, [
        schedules,
        searchTerm,
        dayFilter,
        weekFilter,
        yearFilter,
        completedFilter,
        sortConfig,
        currentPage,
        pageSize,
    ]);

    useEffect(() => {
        setFilteredSchedules(processedSchedules);
    }, [processedSchedules]);

    // Sorting handler
    const handleSort = (key: string) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                return current.direction === "asc" ? { key, direction: "desc" } : null;
            }
            return { key, direction: "asc" };
        });
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setDayFilter("all");
        setWeekFilter("all");
        setYearFilter("all");
        setCompletedFilter("all");
        setSortConfig(null);
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        if (!schedules) return;

        const headers = ["Village", "Collector", "Vehicle", "Day", "Week", "Year", "Completed"];
        const rows = schedules.map((s) => [
            s.village.name,
            s.collector?.user || "-",
            s.vehicle?.number_plate || "-",
            s.get_day_of_week_display,
            s.week_number,
            s.year,
            s.is_completed ? "Yes" : "No",
        ]);

        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "schedules.csv";
        a.click();
    };

    if (loading) {
        return <div className="text-center py-10">Loading schedules...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search by village, collector, vehicle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select value={dayFilter} onValueChange={setDayFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Day of Week" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Days</SelectItem>
                        <SelectItem value="0">Monday</SelectItem>
                        <SelectItem value="1">Tuesday</SelectItem>
                        <SelectItem value="2">Wednesday</SelectItem>
                        <SelectItem value="3">Thursday</SelectItem>
                        <SelectItem value="4">Friday</SelectItem>
                        <SelectItem value="5">Saturday</SelectItem>
                        <SelectItem value="6">Sunday</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={weekFilter} onValueChange={setWeekFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Week Number" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Weeks</SelectItem>
                        {[...Array(52)].map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                                Week {i + 1}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {[...Array(5)].map((_, i) => {
                            const year = new Date().getFullYear() - i;
                            return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                        })}
                    </SelectContent>
                </Select>

                <Select value={completedFilter} onValueChange={setCompletedFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Completed" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" onClick={handleResetFilters}>
                    <X className="mr-2 h-4 w-4" /> Reset
                </Button>
            </div>

            {/* Export Buttons */}
            <div className="flex justify-end gap-2 mb-4">
                <Button onClick={exportToCSV} variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("village.name")}>
                            Village <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("collector.user")}>
                            Collector <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("vehicle.number_plate")}>
                            Vehicle <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("day_of_week")}>
                            Day <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("week_number")}>
                            Week/Year <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("is_completed")}>
                            Completed <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSchedules.map((s) => (
                        <TableRow key={s.id}>
                            <TableCell>{s.village.name}</TableCell>
                            <TableCell>{s.collector?.user || "-"}</TableCell>
                            <TableCell>{s.vehicle?.number_plate || "-"}</TableCell>
                            <TableCell>{s.get_day_of_week_display}</TableCell>
                            <TableCell>{s.week_number}/{s.year}</TableCell>
                            <TableCell>{s.is_completed ? "Yes" : "No"}</TableCell>
                        </TableRow>
                    ))}
                    {filteredSchedules.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-10">
                                No schedules found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                    Showing {filteredSchedules.length} of {schedules?.length || 0} schedules
                </div>
                <div className="flex items-center gap-4">
                    <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="10" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-4 py-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}