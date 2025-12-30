// components/fleet/CommandBar.tsx
"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import {
    Car, Plus, Fuel, Wrench, MapPin, Download, Moon, Sun,
    Sparkles, Search, Radio, AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CommandBar({
                                       isOpen,
                                       onClose,
                                       darkMode,
                                       toggleDarkMode,
                                       onAddVehicle,
                                       onExport,
                                       vehicles
                                   }: any) {
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <Command className="relative w-full max-w-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-3xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="flex items-center gap-4 px-8 py-6 border-b border-gray-200 dark:border-gray-800">
                    <Search className="w-6 h-6 text-gray-400" />
                    <Command.Input
                        placeholder="Ask Fleet OS anything... (e.g. 'Show vehicles on road', 'Add fuel to RAB 123A')"
                        className="flex-1 outline-none text-lg"
                        autoFocus
                    />
                </div>

                <Command.List className="max-h-96 overflow-y-auto p-4">
                    <Command.Empty>No results found.</Command.Empty>

                    <Command.Group heading="Quick Actions">
                        <Command.Item onSelect={onAddVehicle}>
                            <Plus className="w-5 h-5 mr-3" /> Add New Vehicle
                        </Command.Item>
                        <Command.Item onSelect={onExport}>
                            <Download className="w-5 h-5 mr-3" /> Export Fleet Report
                        </Command.Item>
                        <Command.Item onSelect={toggleDarkMode}>
                            {darkMode ? <Sun className="w-5 h-5 mr-3" /> : <Moon className="w-5 h-5 mr-3" />}
                            Toggle {darkMode ? "Light" : "Dark"} Mode
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="AI Commands">
                        <Command.Item>
                            <Sparkles className="w-5 h-5 mr-3 text-purple-600" /> Predict maintenance for next week
                        </Command.Item>
                        <Command.Item>
                            <AlertTriangle className="w-5 h-5 mr-3 text-red-600" /> Show high-risk vehicles
                        </Command.Item>
                        <Command.Item>
                            <Radio className="w-5 h-5 mr-3 text-green-600" /> Find vehicles with live GPS
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Vehicles">
                        {vehicles.slice(0, 8).map((v: any) => (
                            <Command.Item key={v.id} onSelect={() => {
                                toast(`Opening ${v.registration_number}`);
                                onClose();
                            }}>
                                <Car className="w-5 h-5 mr-3" />
                                {v.registration_number} • {v.brand} {v.model}
                                <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                                    v.status === "on_road" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                                }`}>
                  {v.status.replace("_", " ")}
                </span>
                            </Command.Item>
                        ))}
                    </Command.Group>
                </Command.List>
            </Command>
        </div>
    );
}