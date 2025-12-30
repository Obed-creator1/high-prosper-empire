// components/customer/CustomerHeader.tsx — MODERN & RESPONSIVE CUSTOMER HEADER
"use client";

import { useState, useEffect } from "react";
import { Bell, Sun, Moon, Menu, X, Download, Printer, FileText, Plus, Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface CustomerHeaderProps {
    isAdmin: boolean;
    setRegisterOpen: (open: boolean) => void;
    exportToCSV: () => void;
    exportToExcel: () => void;
    exportToPDF: () => void;
    handlePrint: () => void;
    onSearch?: (term: string) => void; // Optional: pass search term to parent
}

export default function CustomerHeader({
                                           isAdmin,
                                           setRegisterOpen,
                                           exportToCSV,
                                           exportToExcel,
                                           exportToPDF,
                                           handlePrint,
                                           onSearch,
                                       }: CustomerHeaderProps) {
    const [darkMode, setDarkMode] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const savedMode = localStorage.getItem("darkMode");
        if (savedMode !== null) {
            setDarkMode(savedMode === "true");
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
        localStorage.setItem("darkMode", darkMode.toString());
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(!darkMode);

    // Pass search term to parent if provided
    useEffect(() => {
        if (onSearch) {
            onSearch(searchTerm);
        }
    }, [searchTerm, onSearch]);

    const clearSearch = () => {
        setSearchTerm("");
        if (onSearch) onSearch("");
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 dark:border-gray-800/50 bg-white/70 dark:bg-gray-950/70 backdrop-blur-lg shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo / Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                            HP
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Customers
                            </h1>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Intelligence Center</span>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input
                                placeholder="Search customers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-10 py-2 bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                            />
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Notification Bell */}
                        <NotificationBell />

                        {/* Dark Mode Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleDarkMode}
                            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {darkMode ? (
                                <Sun className="h-5 w-5 text-yellow-400" />
                            ) : (
                                <Moon className="h-5 w-5 text-gray-700" />
                            )}
                        </Button>

                        {/* Export Buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                                className="gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToCSV}
                                className="gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <Download className="h-4 w-4" />
                                CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToExcel}
                                className="gap-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                            >
                                <Download className="h-4 w-4" />
                                Excel
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToPDF}
                                className="gap-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                                <FileText className="h-4 w-4" />
                                PDF
                            </Button>
                        </div>

                        {/* Add Customer (Admin Only) */}
                        {isAdmin && (
                            <Button
                                onClick={() => setRegisterOpen(true)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transform hover:scale-105 transition-all duration-300"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Customer
                            </Button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden"
                    >
                        <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    placeholder="Search customers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-10 py-3 bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>

                            {/* Notification Bell */}
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium">Notifications</span>
                                <NotificationBell />
                            </div>

                            {/* Dark Mode */}
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium">Dark Mode</span>
                                <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                                    {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                </Button>
                            </div>

                            {/* Export Buttons */}
                            <div className="flex flex-col gap-2 py-2">
                                <span className="text-sm font-medium">Export</span>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" size="sm" onClick={handlePrint}>
                                        <Printer className="mr-2 h-4 w-4" /> Print
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                                        <Download className="mr-2 h-4 w-4" /> CSV
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={exportToExcel}>
                                        <Download className="mr-2 h-4 w-4" /> Excel
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={exportToPDF}>
                                        <FileText className="mr-2 h-4 w-4" /> PDF
                                    </Button>
                                </div>
                            </div>

                            {/* Add Customer */}
                            {isAdmin && (
                                <Button
                                    onClick={() => setRegisterOpen(true)}
                                    className="mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Customer
                                </Button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}