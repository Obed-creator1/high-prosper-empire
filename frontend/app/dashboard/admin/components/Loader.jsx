"use client";

export default function Loader() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 border-4 border-blue-500/30 rounded-full animate-ping"></div>
        <div className="w-16 h-16 border-4 border-t-blue-600 border-b-transparent border-l-transparent border-r-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
