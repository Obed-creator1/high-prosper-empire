// components/HeatmapChart.tsx  (or inside your page file)

import React from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    XAxis,
    YAxis,
    Tooltip,
    Rectangle,
} from 'recharts';

interface HeatmapDataPoint {
    day: number;   // 1 = Monday ... 7 = Sunday
    hour: number;  // 0–23
    value: number;
}

interface HeatmapChartProps {
    data: HeatmapDataPoint[];
    selectedDays: number[];
    dragStartDay: number | null;
    hoveredDay: number | null;
    isDragging: boolean;
    onDayClick: (day: number, isMultiSelect: boolean) => void;
    onDayHover?: (day: number | null) => void; // optional hover callback
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({
                                                       data = [],
                                                       selectedDays = [],
                                                       dragStartDay = null,
                                                       hoveredDay = null,
                                                       isDragging = false,
                                                       onDayClick,
                                                       onDayHover,
                                                   }) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Compute chartData once — before any JSX
    const chartData = days.map((dayName, dayIndex) => {
        const dayNum = dayIndex + 1;
        return {
            day: dayName,
            dayNum,
            isSelected: selectedDays.includes(dayNum),
            ...hours.reduce((acc: Record<string, number>, hour) => {
                const point = data.find((d) => d.day === dayNum && d.hour === hour);
                acc[`h${hour}`] = point ? point.value : 0;
                return acc;
            }, {}),
        };
    });

    // Drag range check (used in highlight rectangles)
    const isInRange = (dayNum: number): boolean =>
        dragStartDay !== null &&
        isDragging &&
        dayNum >= Math.min(dragStartDay, hoveredDay ?? 0) &&
        dayNum <= Math.max(dragStartDay, hoveredDay ?? 0);

    // Color scale (green intensity based on value)
    const getColor = (value: number): string => {
        if (value === 0) return '#1f2937';       // dark gray (no activity)
        if (value < 10) return '#bbf7d0';        // very light green
        if (value < 30) return '#86efac';
        if (value < 60) return '#4ade80';
        if (value < 100) return '#22c55e';
        return '#15803d';                        // dark green (high activity)
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
            >
                <XAxis type="number" hide />
                <YAxis
                    type="category"
                    dataKey="day"
                    width={60}
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                    onClick={(e: any) => {
                        const dayIndex = days.indexOf(e.value);
                        if (dayIndex !== -1) {
                            const dayNum = dayIndex + 1;
                            const isMulti = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
                            onDayClick(dayNum, isMulti);
                        }
                    }}
                    cursor="pointer"
                />

                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                    content={({ active, payload }) => {
                        if (active && payload?.length) {
                            const entry = payload[0];
                            const hour = entry.name?.replace('h', '') ?? '';
                            return (
                                <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                                    <p className="font-medium">{hour}:00 – {entry.value} activities</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />

                {/* Main heatmap cells */}
                {hours.map((hour) => (
                    <Rectangle
                        key={`h${hour}`}
                        dataKey={`h${hour}`}
                        fill={(entry: any) => getColor(entry[`h${hour}`])}
                        stroke="rgba(255,255,255,0.05)"
                        width={40}
                        height={40}
                        radius={6}
                    />
                ))}

                {/* Highlight selected days + drag range */}
                {chartData.map((entry) => {
                    const isHighlighted =
                        entry.isSelected ||
                        (isInRange(entry.dayNum) && isDragging);

                    if (!isHighlighted) return null;

                    return (
                        <Rectangle
                            key={`highlight-${entry.dayNum}`}
                            y={entry.day}
                            height={40}
                            width="100%"
                            fill={
                                isInRange(entry.dayNum) && isDragging
                                    ? 'rgba(59, 130, 246, 0.25)'
                                    : 'rgba(59, 130, 246, 0.15)'
                            }
                            stroke={
                                isInRange(entry.dayNum) && isDragging
                                    ? '#3b82f6'
                                    : 'rgba(59, 130, 246, 0.4)'
                            }
                            strokeWidth={isInRange(entry.dayNum) && isDragging ? 2 : 1}
                            radius={6}
                        />
                    );
                })}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

export default HeatmapChart;