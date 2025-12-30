"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const links = [
    { href: "/dashboard/admin", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { href: "/components/UserTabl", icon: <Users size={20} />, label: "Users" },
    { href: "/dashboard/settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 240 }}
      className="fixed left-0 top-0 h-full border-r bg-white dark:bg-gray-900 shadow-md transition-all duration-300 flex flex-col justify-between"
    >
      {/* Top */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Admin Panel
            </h1>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800">
            <Menu size={20} />
          </button>
        </div>

        {/* Links */}
        <nav className="mt-4 flex flex-col gap-2">
          {links.map((link, i) => (
            <Link
              key={i}
              href={link.href}
              className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
            >
              {link.icon}
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-medium"
                  >
                    {link.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm"
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </motion.span>
          )}
        </button>

        <button className="flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition">
          <LogOut size={20} />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-medium"
            >
              Logout
            </motion.span>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
