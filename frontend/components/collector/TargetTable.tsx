// components/collector/TargetTable.tsx
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
import * as XLSX from "xlsx";

export default function TargetTable() {
    const [targets, setTargets] = useState<any[]>([]); // Always array
    const [filteredTargets, setFilteredTargets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [monthFilter, setMonthFilter] = useState("all");
    const [yearFilter, setYearFilter] = useState("all");
    const [minPercentage, setMinPercentage] = useState<number | "">("");

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
        fetchTargets();
    }, []);

    const fetchTargets = async () => {
        try {
            const res = await api.get("/collector/targets/");
            // Handle both plain array and paginated response
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setTargets(data);
            setFilteredTargets(data);
        } catch (err) {
            console.error("Failed to load targets:", err);
            toast.error("Failed to load targets");
            setTargets([]); // Fallback to empty array
        } finally {
            setLoading(false);
        }
    };

    // Apply filters, search, sorting & pagination
    const processedTargets = useMemo(() => {
        let result = [...targets]; // Safe: targets is always array

        // Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter((t) =>
                (t.collector?.user?.toLowerCase() || "").includes(lowerSearch) ||
                (t.village?.name?.toLowerCase() || "").includes(lowerSearch)
            );
        }

        // Month Filter
        if (monthFilter !== "all") {
            result = result.filter((t) => t.month === parseInt(monthFilter));
        }

        // Year Filter
        if (yearFilter !== "all") {
            result = result.filter((t) => t.year === parseInt(yearFilter));
        }

        // Min Percentage
        if (minPercentage !== "") {
            result = result.filter((t) => (t.percentage_achieved ?? 0) >= minPercentage);
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
    }, [
        targets,
        searchTerm,
        monthFilter,
        yearFilter,
        minPercentage,
        sortConfig,
        currentPage,
        pageSize,
    ]);

    useEffect(() => {
        setFilteredTargets(processedTargets);
    }, [processedTargets]);

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
        setMonthFilter("all");
        setYearFilter("all");
        setMinPercentage("");
        setSortConfig(null);
        setCurrentPage(1);
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(
            targets.map((t) => ({
                Collector: t.collector?.user || "Unknown",
                Village: t.village?.name || "Unknown",
                Month: t.month,
                Year: t.year,
                Target: t.target_amount,
                Collected: t.collected_amount,
                Percentage: t.percentage_achieved,
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Targets");
        XLSX.writeFile(wb, "collector_targets.xlsx");
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search by collector or village..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {[...Array(12)].map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {new Date(0, i).toLocaleString("default", { month: "long" })}
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

                <Select value={minPercentage.toString()} onValueChange={(v) => setMinPercentage(v === "" ? "" : parseFloat(v))}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Min % Achieved" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="50">50%+</SelectItem>
                        <SelectItem value="75">75%+</SelectItem>
                        <SelectItem value="90">90%+</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" onClick={handleResetFilters}>
                    <X className="mr-2 h-4 w-4" /> Reset
                </Button>
            </div>

            {/* Export Buttons */}
            <div className="flex justify-end gap-2 mb-4">
                <Button onClick={exportToExcel} variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Excel
                </Button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading targets...</div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("collector.user")}>
                                    Collector <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("village.name")}>
                                    Village <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("month")}>
                                    Month/Year <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("target_amount")}>
                                    Target <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("collected_amount")}>
                                    Collected <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("percentage_achieved")}>
                                    Percentage <ArrowUpDown className="inline ml-2 h-4 w-4" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTargets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                        No targets found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTargets.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.collector?.user || "Unknown"}</TableCell>
                                        <TableCell>{t.village?.name || "Unknown"}</TableCell>
                                        <TableCell>{t.month}/{t.year}</TableCell>
                                        <TableCell>{t.target_amount || "-"}</TableCell>
                                        <TableCell>{t.collected_amount || "-"}</TableCell>
                                        <TableCell>{t.percentage_achieved ? `${t.percentage_achieved}%` : "-"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                            Showing {filteredTargets.length} of {targets.length} targets
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