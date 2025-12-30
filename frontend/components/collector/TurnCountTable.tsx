// components/collector/TurnCountTable.tsx
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function TurnCountTable() {
    const [turns, setTurns] = useState<any[]>([]); // Always array, no null
    const [filteredTurns, setFilteredTurns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({});

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
        fetchTurns();
    }, []);

    const fetchTurns = async () => {
        try {
            const res = await api.get("/collector/turn-counts/");
            // Handle both array and paginated response (DRF style)
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setTurns(data);
            setFilteredTurns(data);
        } catch (err) {
            console.error("Failed to load turn counts:", err);
            toast.error("Failed to load turn counts");
            setTurns([]); // Fallback to empty array
        } finally {
            setLoading(false);
        }
    };

    // Apply filters, search, sorting & pagination
    const processedTurns = useMemo(() => {
        let result = [...turns]; // Safe: turns is always array

        // Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter((t) =>
                (t.vehicle?.number_plate?.toLowerCase() || "").includes(lowerSearch) ||
                (t.village?.name?.toLowerCase() || "").includes(lowerSearch)
            );
        }

        // Date Range
        if (dateRange.from) {
            result = result.filter((t) => new Date(t.date) >= dateRange.from!);
        }
        if (dateRange.to) {
            result = result.filter((t) => new Date(t.date) <= dateRange.to!);
        }

        // Sorting
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const aVal = a[sortConfig.key] ?? 0;
                const bVal = b[sortConfig.key] ?? 0;
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
    }, [turns, searchTerm, dateRange, sortConfig, currentPage, pageSize]);

    useEffect(() => {
        setFilteredTurns(processedTurns);
    }, [processedTurns]);

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
        setDateRange({});
        setSortConfig(null);
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        const headers = ["Vehicle", "Village", "Date", "Turn Count", "Monthly Total"];
        const rows = turns.map((t) => [
            t.vehicle?.number_plate || "-",
            t.village?.name || "-",
            t.date,
            t.turn_count,
            t.monthly_total,
        ]);

        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "turn_counts.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search by vehicle or village..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? format(dateRange.from, "PPP") : "Date Range"}{" "}
                            - {dateRange.to ? format(dateRange.to, "PPP") : ""}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
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
            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading turn counts...</div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("vehicle.number_plate")}>
                                    Vehicle <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("village.name")}>
                                    Village <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                                    Date <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("turn_count")}>
                                    Turn Count <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("monthly_total")}>
                                    Monthly Total <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTurns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                                        No turn counts found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTurns.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.vehicle?.number_plate || "-"}</TableCell>
                                        <TableCell>{t.village?.name || "-"}</TableCell>
                                        <TableCell>{t.date || "-"}</TableCell>
                                        <TableCell>{t.turn_count ?? 0}</TableCell>
                                        <TableCell>{t.monthly_total ?? 0}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                            Showing {filteredTurns.length} of {turns.length} turn counts
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
                </>
            )}
        </div>
    );
}