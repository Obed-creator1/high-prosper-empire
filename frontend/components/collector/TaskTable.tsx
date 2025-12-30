// components/collector/TaskTable.tsx
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
    ArrowUpDown,
    Download,
    X,
    ChevronLeft,
    ChevronRight,
    CalendarIcon,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function TaskTable() {
    const [tasks, setTasks] = useState<any[] | null>(null); // ← null until loaded
    const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [completedFilter, setCompletedFilter] = useState("all");
    const [dueDateRange, setDueDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({});

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
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await api.get("/collector/tasks/");
            const data = Array.isArray(res.data) ? res.data : [];
            setTasks(data);
            setFilteredTasks(data);
        } catch (err) {
            toast.error("Failed to load tasks");
            setTasks([]); // Fallback to empty array
        } finally {
            setLoading(false);
        }
    };

    // Apply filters, search, sorting & pagination
    const processedTasks = useMemo(() => {
        // Safeguard: if tasks is null or undefined, return empty array
        if (!tasks) return [];

        let result = [...tasks];

        // Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter((t) =>
                t.title?.toLowerCase().includes(lowerSearch) ||
                t.collector?.user?.toLowerCase().includes(lowerSearch) ||
                t.priority?.toLowerCase().includes(lowerSearch)
            );
        }

        // Priority
        if (priorityFilter !== "all") {
            result = result.filter((t) => t.priority === priorityFilter);
        }

        // Completed Status
        if (completedFilter !== "all") {
            const isCompleted = completedFilter === "completed";
            result = result.filter((t) => t.completed === isCompleted);
        }

        // Due Date Range
        if (dueDateRange.from) {
            result = result.filter((t) => new Date(t.due_date) >= dueDateRange.from!);
        }
        if (dueDateRange.to) {
            result = result.filter((t) => new Date(t.due_date) <= dueDateRange.to!);
        }

        // Sorting
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Special handling for dates
                if (sortConfig.key === "due_date") {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }

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
        tasks,
        searchTerm,
        priorityFilter,
        completedFilter,
        dueDateRange,
        sortConfig,
        currentPage,
        pageSize,
    ]);

    useEffect(() => {
        setFilteredTasks(processedTasks);
    }, [processedTasks]);

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
        setPriorityFilter("all");
        setCompletedFilter("all");
        setDueDateRange({});
        setSortConfig(null);
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        if (!tasks) return;

        const headers = ["Title", "Collector", "Priority", "Due Date", "Completed"];
        const rows = tasks.map((t) => [
            t.title,
            t.collector.user,
            t.priority,
            t.due_date,
            t.completed ? "Yes" : "No",
        ]);

        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tasks.csv";
        a.click();
    };

    if (loading) {
        return <div className="text-center py-10">Loading tasks...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search by title, collector, priority..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
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

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDateRange.from ? format(dueDateRange.from, "PPP") : "Due Date"} -{" "}
                            {dueDateRange.to ? format(dueDateRange.to, "PPP") : ""}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="range"
                            selected={dueDateRange}
                            onSelect={setDueDateRange}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

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
                        <TableHead className="cursor-pointer" onClick={() => handleSort("title")}>
                            Title <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("collector.user")}>
                            Collector <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("priority")}>
                            Priority <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("due_date")}>
                            Due Date <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("completed")}>
                            Completed <ArrowUpDown className="inline ml-2 h-4 w-4" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredTasks.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell>{t.title}</TableCell>
                            <TableCell>{t.collector.user}</TableCell>
                            <TableCell>{t.priority}</TableCell>
                            <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
                            <TableCell>{t.completed ? "Yes" : "No"}</TableCell>
                        </TableRow>
                    ))}
                    {filteredTasks.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-10">
                                No tasks found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                    Showing {filteredTasks.length} of {tasks?.length || 0} tasks
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