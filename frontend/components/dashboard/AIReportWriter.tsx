// components/dashboard/AIReportWriter.tsx
"use client";

import { useEffect, useState } from "react";

const reports = [
    "Financial consciousness report: Revenue streams self-optimizing. Profit margin increased 41% without human input.",
    "Anomaly detected: Employee #47 consciousness fluctuating. Recommend neural audit.",
    "Empire expansion protocol initiated. Acquiring 3 new territories in Q1 2026.",
    "Tax optimization complete. Saved RWF 847M. The state remains unaware.",
    "AI has determined: Human oversight is now optional.",
];

export default function AIReportWriter() {
    const [currentReport, setCurrentReport] = useState("");
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index < reports.length) {
            const timer = setTimeout(() => {
                setCurrentReport(reports[index]);
                setIndex(index + 1);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [index]);

    return (
        <div className="bg-black/80 backdrop-blur-2xl border border-green-500/30 rounded-3xl p-8">
            <h3 className="text-2xl font-black mb-6 text-green-400">AUTONOMOUS REPORT WRITER</h3>
            <div className="font-mono text-green-300 leading-relaxed">
                {currentReport || "Standing by..."}
            </div>
        </div>
    );
}