// components/layout/DashboardLayout.tsx
"use client";

import { ThemeToggle } from '@/components/common/ThemeToggle';
import { RealTimeBadge } from '@/components/common/RealTimeBadge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
    LayoutDashboard,
    Package,
    Warehouse,
    Truck,
    Users,
    FileText,
    Settings,
    LogOut,
    Menu,
    Bell
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Stock Control', href: '/stock', icon: Package },
    { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
    { name: 'Transfers', href: '/transfers', icon: Truck },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
    children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();

    const Sidebar = () => (
        <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 to-slate-950 text-white">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    HIGH PROSPER
                </h2>
                <p className="text-xs text-slate-400 mt-1">Enterprise Suite • 2025</p>
            </div>

            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href}>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={`w-full justify-start gap-3 text-left font-medium transition-all ${
                                    isActive
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                                        : 'hover:bg-slate-800'
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Button>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                    <RealTimeBadge connected={true} />
                    <Button size="icon" variant="ghost">
                        <Bell className="w-5 h-5" />
                    </Button>
                </div>
                <div className="pt-4 border-t border-slate-800">
                    <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/50">
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-gray-950">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex lg:w-72 lg:flex-col">
                <Sidebar />
            </div>

            {/* Mobile Header + Sheet */}
            <div className="flex flex-1 flex-col">
                <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur px-6">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <Sidebar />
                        </SheetContent>
                    </Sheet>

                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold hidden sm:block">
                            High Prosper Services
                        </h1>
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}