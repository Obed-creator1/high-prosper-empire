// components/StatsCard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

type IconType = "dollar" | "package" | "alert" | "building" | "trending";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon?: IconType;
    color?: string;
    trend?: number;
}

const iconMap: Record<IconType, React.ReactNode> = {
    dollar: <span className="text-2xl font-bold">$</span>,
    package: (
        <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
        </svg>
    ),
    alert: (
        <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
        </svg>
    ),
    building: (
        <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h-4m-6 0H5"
            />
        </svg>
    ),
    trending: <TrendingUp className="w-5 h-5" />,
};

const colorMap: Record<IconType, string> = {
    dollar: "text-green-600",
    package: "text-blue-600",
    alert: "text-red-600",
    building: "text-purple-600",
    trending: "text-emerald-600",
};

const StatsCard: React.FC<StatsCardProps> = ({
                                                 title,
                                                 value,
                                                 icon = "package",
                                                 color,
                                                 trend,
                                             }) => {
    const iconColor = color || colorMap[icon] || "text-muted-foreground";

    return (
        <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg bg-muted/50", iconColor)}>
                    {iconMap[icon]}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{value}</div>
                {trend !== undefined && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <TrendingUp
                            className={cn(
                                "w-4 h-4",
                                trend > 0 ? "text-green-600" : "text-red-600 rotate-180"
                            )}
                        />
                        <span
                            className={trend > 0 ? "text-green-600" : "text-red-600"}
                        >
              {Math.abs(trend)}%
            </span>{" "}
                        from last month
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default StatsCard;
