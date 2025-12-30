// components/Sidebar.tsx — FINAL CORRECTED ADVANCED SIDEBAR 2026
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import {
    HomeIcon,
    UsersIcon,
    BuildingOffice2Icon,
    CurrencyDollarIcon,
    UserGroupIcon,
    ClipboardDocumentIcon,
    TruckIcon,
    BanknotesIcon,
    CubeIcon,
    ShoppingCartIcon,
    BuildingStorefrontIcon,
    WrenchScrewdriverIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    ClipboardDocumentListIcon,
    UserCircleIcon,
    CreditCardIcon,
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    BellIcon,
    TableCellsIcon,
    BuildingLibraryIcon,
    DocumentTextIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    DocumentMagnifyingGlassIcon,
    StarIcon,
    FaceSmileIcon,
    CheckBadgeIcon,
    CalendarDaysIcon,
    ClockIcon,
    MapIcon,
    BoltIcon,
    SunIcon,
    ExclamationTriangleIcon,
    HandThumbUpIcon,
    ChartPieIcon,
    ClipboardDocumentCheckIcon,
    GlobeAltIcon,
    Squares2X2Icon,
    MapPinIcon,
    UserIcon,
    CalendarIcon,
    ArrowPathRoundedSquareIcon,
    FlagIcon,
    FireIcon,
    ShieldCheckIcon,
    WrenchIcon,
    ReceiptPercentIcon,
    TagIcon,
    BuildingOfficeIcon,
    DocumentPlusIcon,
    MegaphoneIcon,
    ChatBubbleBottomCenterTextIcon,
    ShoppingBagIcon,
    InboxIcon,
    ReceiptRefundIcon,
    CalculatorIcon,
    FolderIcon,
    SquaresPlusIcon,
    ArchiveBoxIcon,
    ArrowRightCircleIcon,
    ArrowPathIcon,
    MagnifyingGlassCircleIcon,
    BellAlertIcon,
    AdjustmentsHorizontalIcon,
    RectangleStackIcon,
    TicketIcon,
    ChartBarSquareIcon,
} from "@heroicons/react/24/solid";
import {ArrowLeftRightIcon, ChevronLeftIcon, X} from "lucide-react";

type MenuGroup = {
    title: string;
    icon: React.ReactNode;
    items: { title: string; href: string; icon: React.ReactNode }[];
    roles: string[];
};

type SidebarProps = {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["Users Management"]));
    const [searchQuery, setSearchQuery] = useState("");
    const [role, setRole] = useState<string | null>(null);
    const pathname = usePathname();



    useEffect(() => {
        const userRole = Cookies.get("role")?.toLowerCase();
        setRole(userRole || null);

    }, []);

    const menuGroups: MenuGroup[] = [
        {
            title: "Dashboard",
            icon: <HomeIcon className="w-5 h-5" />,
            items: [{ title: "Overview", href: "/dashboard", icon: <ChartBarIcon className="w-4 h-4" /> }],
            roles: ["ceo", "admin", "manager", "accounting", "hr", "collector"],
        },
        {
            title: "Users Management",
            icon: <UsersIcon className="w-5 h-5" />,
            items: [
                { title: "Users Table", href: "/dashboard/admin/users", icon: <TableCellsIcon className="w-4 h-4" /> },
                { title: "Chat", href: "/dashboard/chat", icon: <ChatBubbleLeftRightIcon className="w-4 h-4" /> },
                { title: "Notifications", href: "/notifications", icon: <BellIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "hr"],
        },
        {
            title: "Accounting",
            icon: <CurrencyDollarIcon className="w-5 h-5" />,
            items: [
                { title: "Accounts", href: "/dashboard/accounting", icon: <BuildingLibraryIcon className="w-4 h-4" /> },
                { title: "Journal Entries", href: "/dashboard/accounting/journal/new", icon: <DocumentTextIcon className="w-4 h-4" /> },
                { title: "Receivables", href: "/dashboard/accounting/receivables", icon: <ArrowTrendingUpIcon className="w-4 h-4" /> },
                { title: "Payables", href: "/dashboard/accounting/payables", icon: <ArrowTrendingDownIcon className="w-4 h-4" /> },
                { title: "Revenue", href: "/dashboard/accounting/revenue", icon: <BanknotesIcon className="w-4 h-4" /> },
                { title: "Expenses", href: "/dashboard/accounting/expenses", icon: <CreditCardIcon className="w-4 h-4" /> },
                { title: "General Ledger", href: "/dashboard/accounting/ledger", icon: <DocumentMagnifyingGlassIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "accounting", "manager"],
        },
        {
            title: "HR Management",
            icon: <UserGroupIcon className="w-5 h-5" />,
            items: [
                { title: "Staff", href: "/dashboard/hr/staff", icon: <UsersIcon className="w-4 h-4" /> },
                { title: "Performance Score", href: "/dashboard/hr/performance", icon: <StarIcon className="w-4 h-4" /> },
                { title: "Sentiment Feedback", href: "/dashboard/hr/feedback", icon: <FaceSmileIcon className="w-4 h-4" /> },
                { title: "Payroll", href: "/dashboard/hr/payroll", icon: <BanknotesIcon className="w-4 h-4" /> },
                { title: "Payroll Approval", href: "/dashboard/hr/payroll/approval", icon: <CheckBadgeIcon className="w-4 h-4" /> },
                { title: "Salary Advance", href: "/dashboard/hr/salary-advance", icon: <CurrencyDollarIcon className="w-4 h-4" /> },
                { title: "Salary Repayment", href: "/dashboard/hr/salary-repayment", icon: <ArrowPathIcon className="w-4 h-4" /> },
                { title: "Leave Management", href: "/dashboard/hr/leaves", icon: <CalendarDaysIcon className="w-4 h-4" /> },
                { title: "Attendance", href: "/dashboard/hr/attendance", icon: <ClockIcon className="w-4 h-4" /> },
                { title: "Missions", href: "/dashboard/hr/missions", icon: <MapIcon className="w-4 h-4" /> },
                { title: "Extra Work", href: "/dashboard/hr/extra-work", icon: <BoltIcon className="w-4 h-4" /> },
                { title: "Vacation", href: "/dashboard/hr/vacation", icon: <SunIcon className="w-4 h-4" /> },
                { title: "Complaints", href: "/dashboard/hr/complaints", icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
                { title: "Loans", href: "/dashboard/hr/loans", icon: <HandThumbUpIcon className="w-4 h-4" /> },
                { title: "Reports", href: "/dashboard/hr/reports", icon: <ChartPieIcon className="w-4 h-4" /> },
                { title: "Tasks", href: "/dashboard/hr/tasks", icon: <ClipboardDocumentCheckIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "hr", "manager"],
        },
        {
            title: "Customers",
            icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
            items: [
                { title: "Sectors", href: "/dashboard/customers/sectors", icon: <GlobeAltIcon className="w-4 h-4" /> },
                { title: "Cells", href: "/dashboard/customers/cells", icon: <Squares2X2Icon className="w-4 h-4" /> },
                { title: "Villages", href: "/dashboard/customers/villages", icon: <MapPinIcon className="w-4 h-4" /> },
                { title: "Customers", href: "/dashboard/admin/customers", icon: <UsersIcon className="w-4 h-4" /> },
                { title: "Ledger Entries", href: "/dashboard/customers/ledger", icon: <DocumentTextIcon className="w-4 h-4" /> },
                { title: "Service Orders", href: "/dashboard/customers/orders", icon: <WrenchScrewdriverIcon className="w-4 h-4" /> },
                { title: "Complaints", href: "/dashboard/customers/complaints", icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "manager", "collector"],
        },
        {
            title: "Collectors",
            icon: <UserCircleIcon className="w-5 h-5" />,
            items: [
                { title: "Collectors", href: "/dashboard/collector", icon: <UserIcon className="w-4 h-4" /> },
                { title: "Collection Schedule", href: "/dashboard/collector/schedule", icon: <CalendarIcon className="w-4 h-4" /> },
                { title: "Vehicle Turn Count", href: "/dashboard/collector/turns", icon: <ArrowPathRoundedSquareIcon className="w-4 h-4" /> },
                { title: "Collector Targets", href: "/dashboard/collector/targets", icon: <FlagIcon className="w-4 h-4" /> },
                { title: "Collector Tasks", href: "/dashboard/collector/tasks", icon: <ClipboardDocumentListIcon className="w-4 h-4" /> },
                { title: "Location History", href: "/dashboard/collector/history", icon: <MapIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "manager", "supervisor"],
        },
        {
            title: "Fleet Management",
            icon: <TruckIcon className="w-5 h-5" />,
            items: [
                { title: "Vehicles", href: "/dashboard/admin/fleet", icon: <TruckIcon className="w-4 h-4" /> },
                { title: "Fuel Efficiency", href: "/dashboard/fleet/fuel", icon: <FireIcon className="w-4 h-4" /> },
                { title: "Compliance", href: "/dashboard/fleet/compliance", icon: <ShieldCheckIcon className="w-4 h-4" /> },
                { title: "Workshop Records", href: "/dashboard/fleet/workshop", icon: <WrenchIcon className="w-4 h-4" /> },
                { title: "Drivers", href: "/dashboard/fleet/drivers", icon: <UserIcon className="w-4 h-4" /> },
                { title: "Driver Performance", href: "/dashboard/fleet/driver-performance", icon: <ChartBarIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "manager", "supervisor"],
        },
        {
            title: "Payments",
            icon: <BanknotesIcon className="w-5 h-5" />,
            items: [
                { title: "Invoices", href: "/dashboard/admin/payments", icon: <ReceiptPercentIcon className="w-4 h-4" /> },
                { title: "Payments", href: "/dashboard/payments/history", icon: <CreditCardIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "accounting", "collector"],
        },
        {
            title: "Procurement",
            icon: <ShoppingCartIcon className="w-5 h-5" />,
            items: [
                { title: "Item Categories", href: "/dashboard/procurement/categories", icon: <TagIcon className="w-4 h-4" /> },
                { title: "Items", href: "/dashboard/procurement/items", icon: <CubeIcon className="w-4 h-4" /> },
                { title: "Suppliers", href: "/dashboard/procurement/suppliers", icon: <BuildingOfficeIcon className="w-4 h-4" /> },
                { title: "Purchase Requisitions", href: "/dashboard/procurement/requisitions", icon: <DocumentPlusIcon className="w-4 h-4" /> },
                { title: "RFQs", href: "/dashboard/procurement/rfqs", icon: <MegaphoneIcon className="w-4 h-4" /> },
                { title: "Quotations", href: "/dashboard/procurement/quotations", icon: <ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> },
                { title: "Purchase Orders", href: "/dashboard/procurement/orders", icon: <ShoppingBagIcon className="w-4 h-4" /> },
                { title: "Goods Receipt", href: "/dashboard/procurement/receipt", icon: <InboxIcon className="w-4 h-4" /> },
                { title: "Supplier Invoices", href: "/dashboard/procurement/invoices", icon: <ReceiptRefundIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "accounting", "manager"],
        },
        {
            title: "Stock & Inventory",
            icon: <CubeIcon className="w-5 h-5" />,
            items: [
                { title: "Warehouses", href: "/dashboard/stock/warehouses", icon: <BuildingStorefrontIcon className="w-4 h-4" /> },
                { title: "Valuation Methods", href: "/dashboard/stock/valuation", icon: <CalculatorIcon className="w-4 h-4" /> },
                { title: "Categories", href: "/dashboard/stock/categories", icon: <FolderIcon className="w-4 h-4" /> },
                { title: "Stock Items", href: "/dashboard/admin/stock", icon: <CubeIcon className="w-4 h-4" /> },
                { title: "Warehouse Stock", href: "/dashboard/stock/warehouse-stock", icon: <SquaresPlusIcon className="w-4 h-4" /> },
                { title: "Stock Batches", href: "/dashboard/stock/batches", icon: <ArchiveBoxIcon className="w-4 h-4" /> },
                { title: "Batch Usage", href: "/dashboard/stock/batch-usage", icon: <ArrowRightCircleIcon className="w-4 h-4" /> },
                { title: "Transactions", href: "/dashboard/stock/transactions", icon: <ArrowPathIcon className="w-4 h-4" /> },
                { title: "Transfers", href: "/dashboard/stock/transfers", icon: <ArrowLeftRightIcon className="w-4 h-4" /> },
                { title: "Stock Reports", href: "/dashboard/stock/reports", icon: <ChartPieIcon className="w-4 h-4" /> },
                { title: "Inventory Audit", href: "/dashboard/stock/audit", icon: <MagnifyingGlassCircleIcon className="w-4 h-4" /> },
                { title: "Stock Alerts", href: "/dashboard/stock/alerts", icon: <BellAlertIcon className="w-4 h-4" /> },
                { title: "Turnover Analysis", href: "/dashboard/stock/turnover", icon: <ArrowTrendingUpIcon className="w-4 h-4" /> },
                { title: "Adjustments", href: "/dashboard/stock/adjustments", icon: <AdjustmentsHorizontalIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin", "accounting", "manager"],
        },
        {
            title: "Tenants",
            icon: <BuildingOffice2Icon className="w-5 h-5" />,
            items: [{ title: "Companies", href: "/dashboard/tenants", icon: <BuildingOfficeIcon className="w-4 h-4" /> }],
            roles: ["ceo", "admin"],
        },
        {
            title: "Billing",
            icon: <CreditCardIcon className="w-5 h-5" />,
            items: [
                { title: "Plans", href: "/dashboard/billing/plans", icon: <RectangleStackIcon className="w-4 h-4" /> },
                { title: "Subscriptions", href: "/dashboard/billing/subscriptions", icon: <TicketIcon className="w-4 h-4" /> },
                { title: "Usage Records", href: "/dashboard/billing/usage", icon: <ChartBarSquareIcon className="w-4 h-4" /> },
            ],
            roles: ["ceo", "admin"],
        },
    ];

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return menuGroups.filter((g) => role && g.roles.includes(role));

        const query = searchQuery.toLowerCase();
        return menuGroups.filter((group) => {
            if (!role || !group.roles.includes(role)) return false;
            const matchesTitle = group.title.toLowerCase().includes(query);
            const matchesItem = group.items.some((item) => item.title.toLowerCase().includes(query));
            return matchesTitle || matchesItem;
        });
    }, [menuGroups, role, searchQuery]);

    // Keyboard Shortcuts
    useEffect(() => {

        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if ((e.target as HTMLElement)?.tagName === "INPUT") return;

            const key = e.key.toLowerCase();

            const shortcutMap: { [key: string]: string } = {
                "1": "Dashboard",
                "2": "Users Management",
                "3": "Accounting",
                "4": "HR Management",
                "5": "Customers",
                "6": "Collectors",
                "7": "Fleet Management",
                "8": "Payments",
                "9": "Procurement",
                "0": "Stock & Inventory",
                "t": "Tenants",
                "b": "Billing",
                "d": "Dashboard",
                "u": "Users Management",
                "a": "Accounting",
                "h": "HR Management",
                "c": "Customers",
                "o": "Collectors",
                "f": "Fleet Management",
                "p": "Payments",
                "r": "Procurement",
                "s": "Stock & Inventory",
            };

            const targetGroup = shortcutMap[key];
            if (targetGroup && filteredGroups.some((g) => g.title === targetGroup)) {
                e.preventDefault();
                toggleGroup(targetGroup);
                const element = document.querySelector(`[data-group="${targetGroup.replace(/\s+/g, "-")}"]`);
                element?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [filteredGroups]);

    const isActive = (href: string) => pathname?.startsWith(href);

    const toggleGroup = (title: string) => {
        setOpenGroups((prev) => {
            const newSet = new Set(prev);
            newSet.has(title) ? newSet.delete(title) : newSet.add(title);
            return newSet;
        });
    };




    return (
        <>
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-950 text-white 
          transition-all duration-500 ease-in-out shadow-2xl overflow-hidden
          ${sidebarOpen
                    ? "translate-x-0 w-full max-w-md"
                    : "-translate-x-full md:translate-x-0"
                }
          ${collapsed ? "md:w-20" : "md:w-80"}
        `}
            >

                {/* Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-pink-600/10 pointer-events-none" />

                {/* Header */}
                <div className="relative p-6 border-b border-white/10">
                    {/* Header with Logo & Collapse Button */}
                    <div className="relative flex items-center justify-between p-6 border-b border-white/10">
                        {/* Logo */}
                        <motion.div
                            className="flex items-center gap-4"
                            animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
                            transition={{ duration: 0.3 }}
                        >
                            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                                HIGH PROSPER
                            </h1>
                        </motion.div>

                        {/* Modern Floating Collapse Button - Always Visible */}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 shadow-xl flex items-center justify-center transition-all hover:scale-110 z-10"
                        >
                            {collapsed ? (
                                <ChevronRightIcon className="w-5 h-5 text-white" />
                            ) : (
                                <ChevronLeftIcon className="w-5 h-5 text-white" />
                            )}
                        </button>
                    </div>
                    {/* Close Button Inside Sidebar - Mobile Only */}
                    <div className="absolute right-4 top-6 md:hidden z-10">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    {/* Advanced Search */}
                    {!collapsed && (
                        <div className="relative mt-4">
                            <MagnifyingGlassIcon className="absolute left-4 top-3.5 w-5 h-5 text-purple-300" />
                            <input
                                type="text"
                                placeholder="Search menu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 backdrop-blur-md"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3.5 text-purple-300 hover:text-white">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
                    <AnimatePresence>
                        {filteredGroups.map((group) => (
                            <motion.div key={group.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-1">
                                {/* Group Header */}
                                <button
                                    data-group={group.title.replace(/\s+/g, "-")}
                                    onClick={() => toggleGroup(group.title)}
                                    className={`group relative w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                                        openGroups.has(group.title) ? "bg-gradient-to-r from-purple-600/50 to-pink-600/50 shadow-lg" : "hover:bg-white/10"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            {group.icon}
                                            {/* Group Tooltip — FIXED */}
                                            <div
                                                className={`absolute left-full ml-3 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-md border border-white/20 shadow-xl
          ${collapsed ? "opacity-100" : ""}
        `}
                                            >
                                                {group.title}
                                                <kbd className="ml-2 px-2 py-1 bg-white/20 rounded text-xs">⌥ {group.title[0]}</kbd>
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-6 border-r-black/90" />
                                            </div>
                                        </div>
                                        {!collapsed && <span className="font-semibold text-sm">{group.title}</span>}
                                    </div>
                                    {!collapsed && (
                                        <motion.div animate={{ rotate: openGroups.has(group.title) ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                            <ChevronDownIcon className="w-4 h-4" />
                                        </motion.div>
                                    )}
                                </button>

                                {/* Group Items */}
                                <AnimatePresence>
                                    {openGroups.has(group.title) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pl-8 space-y-1">
                                                {group.items.map((item) => (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                                                            isActive(item.href) ? "bg-purple-600/50 text-white font-medium shadow-md" : "hover:bg-white/10 text-gray-300"
                                                        }`}
                                                    >
                                                        {/* Icon with Tooltip */}
                                                        <div className="relative flex-shrink-0">
                                                            {item.icon}
                                                            {/* Item Tooltip */}
                                                            <div
                                                                className={`absolute left-full ml-4 px-4 py-2.5 bg-black/95 text-white text-xs font-medium rounded-xl 
                                opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out 
                                whitespace-nowrap pointer-events-none z-50 backdrop-blur-xl 
                                border border-white/10 shadow-2xl flex items-center gap-2
                                ${collapsed ? "opacity-100 translate-x-0" : "translate-x-2"}
                              `}
                                                            >
                                                                <span>{item.title}</span>
                                                                {/* Arrow Pointer */}
                                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                                                                    <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-black/95" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Title - visible when expanded */}
                                                        {!collapsed && <span>{item.title}</span>}
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </nav>

                {/* Footer */}
                {!collapsed && (
                    <div className="p-6 border-t border-white/10 text-center">
                        <p className="text-xs text-purple-300">© 2025 High Prosper Services Ltd</p>
                        <p className="text-xs text-cyan-400 mt-1 font-bold">Vision Pro • Intelligence Engine</p>
                    </div>
                )}
            </aside>

            {/* Mobile Overlay - Closes Sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(true)}
                />
            )}
        </>


    );
}