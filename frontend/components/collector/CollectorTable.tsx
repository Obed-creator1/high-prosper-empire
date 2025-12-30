// components/collector/CollectorTable.tsx
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
    CalendarIcon,
    Download,
    Plus,
    Edit,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import ReactSelect from "react-select";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export default function CollectorTable() {
    const [collectors, setCollectors] = useState<any[]>([]);
    const [filteredCollectors, setFilteredCollectors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [minRating, setMinRating] = useState<number | "">("");
    const [minEfficiency, setMinEfficiency] = useState<number | "">("");
    const [selectedVillages, setSelectedVillages] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    // Villages for multi-select
    const [villages, setVillages] = useState<any[]>([]);

    useEffect(() => {
        fetchCollectors();
        fetchVillages();
    }, []);

    const fetchCollectors = async () => {
        try {
            const res = await api.get("/collector/collectors/");
            // Handle both plain array and paginated response (DRF style)
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setCollectors(data);
            setFilteredCollectors(data);
        } catch (err) {
            console.error("Failed to load collectors:", err);
            toast.error("Failed to load collectors");
            setCollectors([]); // Fallback to empty array
        } finally {
            setLoading(false);
        }
    };

    const fetchVillages = async () => {
        try {
            const res = await api.get("/customers/villages-list/");
            const villageOptions = res.data.map((v: any) => ({ value: v.id, label: v.name }));
            setVillages(villageOptions);
        } catch (err) {
            console.error("Failed to load villages:", err);
        }
    };

    // Apply filters & pagination
    const applyFilters = useMemo(() => {
        let result = [...collectors]; // Safe: collectors is always array

        // Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter((c) =>
                (c.full_name || c.user || "").toLowerCase().includes(lowerSearch) ||
                (c.phone || "").includes(lowerSearch) ||
                (c.email || "").toLowerCase().includes(lowerSearch)
            );
        }

        // Status
        if (statusFilter !== "all") {
            result = result.filter((c) => c.is_active === (statusFilter === "active"));
        }

        // Min Rating
        if (minRating !== "") {
            result = result.filter((c) => (c.rating ?? 0) >= minRating);
        }

        // Min Efficiency
        if (minEfficiency !== "") {
            result = result.filter((c) => (c.efficiency_percentage ?? 0) >= minEfficiency);
        }

        // Multi-select Villages
        if (selectedVillages.length > 0) {
            const selectedIds = selectedVillages.map((v) => v.value);
            result = result.filter((c) =>
                c.villages?.some((v: any) => selectedIds.includes(v.id)) ?? false
            );
        }

        // Date Range (joined_date)
        if (dateRange.from) {
            result = result.filter((c) => new Date(c.joined_date) >= dateRange.from!);
        }
        if (dateRange.to) {
            result = result.filter((c) => new Date(c.joined_date) <= dateRange.to!);
        }

        // Pagination
        const total = result.length;
        setTotalPages(Math.ceil(total / pageSize));
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return result.slice(start, end);
    }, [
        collectors,
        searchTerm,
        statusFilter,
        minRating,
        minEfficiency,
        selectedVillages,
        dateRange,
        currentPage,
        pageSize,
    ]);

    useEffect(() => {
        setFilteredCollectors(applyFilters);
    }, [applyFilters]);

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this collector?")) {
            try {
                await api.delete(`/collector/collectors/${id}/`);
                setCollectors(collectors.filter((c) => c.id !== id));
                toast.success("Collector deleted");
            } catch (err) {
                toast.error("Failed to delete collector");
            }
        }
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setMinRating("");
        setMinEfficiency("");
        setSelectedVillages([]);
        setDateRange({});
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        const headers = ["Name", "Phone", "Email", "Rating", "Efficiency", "Customers"];
        const rows = collectors.map((c) => [
            c.full_name || c.user || "Unknown",
            c.phone || "-",
            c.email || "-",
            c.rating || "-",
            c.efficiency_percentage || "-",
            c.total_customers || 0,
        ]);

        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "collectors.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text("High Prosper Collector Report", 20, 20);
        doc.autoTable({
            startY: 30,
            head: [["Name", "Phone", "Email", "Rating", "Efficiency", "Customers"]],
            body: collectors.map((c) => [
                c.full_name || c.user || "Unknown",
                c.phone || "-",
                c.email || "-",
                c.rating || "-",
                c.efficiency_percentage || "-",
                c.total_customers || 0,
            ]),
        });
        doc.save("collectors.pdf");
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(
            collectors.map((c) => ({
                Name: c.full_name || c.user || "Unknown",
                Phone: c.phone || "-",
                Email: c.email || "-",
                Rating: c.rating || "-",
                Efficiency: c.efficiency_percentage || "-",
                Customers: c.total_customers || 0,
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Collectors");
        XLSX.writeFile(wb, "collectors.xlsx");
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search by name, phone, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={minRating.toString()} onValueChange={(v) => setMinRating(v === "all" ? "" : parseFloat(v))}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Min Rating" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="3">3+ Stars</SelectItem>
                        <SelectItem value="4">4+ Stars</SelectItem>
                        <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={minEfficiency.toString()} onValueChange={(v) => setMinEfficiency(v === "all" ? "" : parseFloat(v))}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Min Efficiency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Efficiency</SelectItem>
                        <SelectItem value="70">70%+</SelectItem>
                        <SelectItem value="85">85%+</SelectItem>
                        <SelectItem value="95">95%+</SelectItem>
                    </SelectContent>
                </Select>

                <ReactSelect
                    isMulti
                    options={villages}
                    value={selectedVillages}
                    onChange={setSelectedVillages}
                    placeholder="Select Villages"
                    className="w-[300px]"
                    classNamePrefix="react-select"
                />

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? format(dateRange.from, "PPP") : "Join Date"}{" "}
                            -{" "}
                            {dateRange.to ? format(dateRange.to, "PPP") : ""}
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
                    <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
                <Button onClick={exportToExcel} variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Excel
                </Button>
                <Button onClick={exportToPDF} variant="outline">
                    <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
                <Button variant="default">
                    <Plus className="mr-2 h-4 w-4" /> Add Collector
                </Button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading collectors...</div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead>Efficiency</TableHead>
                                <TableHead>Customers</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCollectors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                                        No collectors found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCollectors.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>{c.full_name || c.user || "Unknown"}</TableCell>
                                        <TableCell>{c.phone || "-"}</TableCell>
                                        <TableCell>{c.email || "-"}</TableCell>
                                        <TableCell>{c.rating ? `${c.rating} ★` : "-"}</TableCell>
                                        <TableCell>{c.efficiency_percentage ? `${c.efficiency_percentage}%` : "-"}</TableCell>
                                        <TableCell>{c.total_customers || 0}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                            Showing {filteredCollectors.length} of {collectors.length} collectors
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