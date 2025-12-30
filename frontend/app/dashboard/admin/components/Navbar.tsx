"use client";
export default function Navbar({ title }: { title: string }) {
  return (
    <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-md">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
    </header>
  );
}
