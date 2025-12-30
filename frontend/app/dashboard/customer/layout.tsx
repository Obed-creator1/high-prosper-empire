// app/dashboard/admin/customers/layout.tsx — DEDICATED CUSTOMER SECTION LAYOUT
import { ReactNode } from "react";
import "./customer.css"; // Import page-specific styles

export default function CustomerLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-slate-950 dark:via-gray-950 dark:to-black text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Header (can be customized per page) */}

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Footer (optional) */}
            <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
                <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    © {new Date().getFullYear()} High Prosper Services Ltd. All rights reserved.
                </div>
            </footer>
        </div>
    );
}