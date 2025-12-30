// components/collector/CollectorFooter.tsx
export default function CollectorFooter() {
    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} High Prosper Services Ltd. All rights reserved.
            </div>
        </footer>
    );
}