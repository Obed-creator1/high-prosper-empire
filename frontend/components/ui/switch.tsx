// components/ui/switch.tsx — FIXED CONTROLLED SWITCH
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const switchVariants = cva(
    "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
    {
        variants: {
            variant: {
                default: "",
                destructive: "data-[state=checked]:bg-destructive",
            },
            size: {
                default: "h-6 w-11",
                sm: "h-5 w-9",
                lg: "h-7 w-14",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

const switchThumbVariants = cva(
    "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
    {
        variants: {
            size: {
                default: "h-5 w-5",
                sm: "h-4 w-4",
                lg: "h-6 w-6 data-[state=checked]:translate-x-7",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
);

interface SwitchProps
    extends React.InputHTMLAttributes<HTMLInputElement>,
        VariantProps<typeof switchVariants> {
    label?: string;
    onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    (
        {
            className,
            variant,
            size,
            label,
            checked,
            onChange,
            onCheckedChange,
            ...props
        },
        ref
    ) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (onChange) onChange(e);
            if (onCheckedChange) onCheckedChange(e.target.checked);
        };

        return (
            <label className="inline-flex items-center gap-3 cursor-pointer">
                <div className="relative">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        ref={ref}
                        checked={checked}
                        onChange={handleChange}
                        {...props}
                    />
                    <div
                        className={cn(switchVariants({ variant, size, className }))}
                        aria-hidden="true"
                    />
                    <div
                        className={cn(switchThumbVariants({ size }))}
                        aria-hidden="true"
                    />
                </div>
                {label && (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
                )}
            </label>
        );
    }
);

Switch.displayName = "Switch";

export { Switch };