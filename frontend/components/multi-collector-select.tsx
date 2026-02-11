// components/multi-collector-select.tsx
"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Collector {
    id: number;
    full_name?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
}

interface MultiCollectorSelectProps {
    value: string[];
    onChange: (values: string[]) => void;
    collectors: Collector[];
    placeholder?: string;
}

export function MultiCollectorSelect({
                                         value = [],
                                         onChange,
                                         collectors,
                                         placeholder = "Select collectors...",
                                     }: MultiCollectorSelectProps) {
    const [open, setOpen] = useState(false);

    const selectedCollectors = collectors.filter(c =>
        value.includes(c.id.toString())
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto py-3 min-h-11 border-dashed"
                >
                    <div className="flex flex-wrap gap-2 items-center max-w-full">
                        {selectedCollectors.length === 0 ? (
                            <span className="text-gray-500">{placeholder}</span>
                        ) : (
                            <div className="flex flex-wrap gap-1">
                                {selectedCollectors.map(c => (
                                    <Badge
                                        key={c.id}
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {c.full_name || c.username}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 max-w-lg" align="start">
                <Command>
                    <CommandInput placeholder="Search collectors..." className="h-10" />
                    <CommandList>
                        <CommandEmpty>No collector found.</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-auto">
                            {collectors.map(collector => {
                                const isSelected = value.includes(collector.id.toString());
                                return (
                                    <CommandItem
                                        key={collector.id}
                                        onSelect={() => {
                                            const idStr = collector.id.toString();
                                            const newValue = isSelected
                                                ? value.filter(id => id !== idStr)
                                                : [...value, idStr];
                                            onChange(newValue);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <Check
                                                className={cn(
                                                    "h-4 w-4",
                                                    isSelected ? "opacity-100 text-purple-600" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {(collector.first_name?.[0] || "")}{(collector.last_name?.[0] || "")}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">
                                                        {collector.full_name || collector.username}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {collector.phone || "No phone"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}