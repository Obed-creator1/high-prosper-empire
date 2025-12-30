"use client";
import { useState } from "react";
import Link from "next/link";
import { HomeIcon, UsersIcon, ClipboardDocumentIcon, TruckIcon, CubeIcon, BanknotesIcon, BriefcaseIcon, BellIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/solid";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { title: "Dashboard", icon: <HomeIcon className="w-5 h-5" />, href: "/dashboard/admin" },
    { title: "Users", icon: <UsersIcon className="w-5 h-5" />, href: "/dashboard/admin/users" },
    { title: "Customers", icon: <ClipboardDocumentIcon className="w-5 h-5" />, href: "/dashboard/admin/customers" },
    { title: "Fleet", icon: <TruckIcon className="w-5 h-5" />, href: "/dashboard/admin/fleet" },
    { title: "Assets", icon: <CubeIcon className="w-5 h-5" />, href: "/dashboard/admin/assets" },
    { title: "Stock", icon: <BriefcaseIcon className="w-5 h-5" />, href: "/dashboard/admin/stock" },
    { title: "Payments", icon: <BanknotesIcon className="w-5 h-5" />, href: "/dashboard/admin/payments" },
    { title: "Notifications", icon: <BellIcon className="w-5 h-5" />, href: "/dashboard/admin/notifications" },
    { title: "Chat", icon: <ChatBubbleLeftIcon className="w-5 h-5" />, href: "/dashboard/admin/chat" },
  ];

  return (
    <aside className={`flex flex-col bg-gray-900 text-white ${collapsed ? "w-16" : "w-64"} transition-width duration-300 min-h-screen`}>
      <button className="p-2" onClick={()=>setCollapsed(!collapsed)}>{collapsed ? "→" : "←"}</button>
      <nav className="flex flex-col mt-5 space-y-2">
        {menuItems.map(item => (
          <Link key={item.title} href={item.href} className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded">
            {item.icon}
            {!collapsed && <span>{item.title}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
