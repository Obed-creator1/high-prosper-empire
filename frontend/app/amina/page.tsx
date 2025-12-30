// AMINA AI VOICE AGENT COMMAND CENTER — 2038
"use client";

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AminaDashboard() {
    const [liveStats, setLiveStats] = useState({
        activeCalls: 84210,
        successRate: 87.3,
        avgCallDuration: "2m 41s",
        languages: { rw: 38, sw: 29, lg: 18, fr: 12, en: 3 },
        sentiment: {
            positive: 81, neutral: 14, angry: 5
        }});


    return (
        <div className="p-10 bg-gradient-to-br from-purple-900 via-black to-blue-900 min-h-screen text-white">
            <h1 className="text-6xl font-black mb-2">AMINA CONTROL CENTER</h1>
            <p className="text-2xl opacity-80">1,842,104 calls today • 98.7% collection rate</p>

            <div className="grid grid-cols-4 gap-8 mt-12">
                <div className="bg-purple-800/50 p-8 rounded-3xl backdrop-blur">
                    <p className="text-5xl font-bold">{liveStats.activeCalls.toLocaleString()}</p>
                    <p className="text-xl opacity-70">Active AI Calls Now</p>
                </div>
                <div className="bg-green-800/50 p-8 rounded-3xl backdrop-blur">
                    <p className="text-5xl font-bold">{liveStats.successRate}%</p>
                    <p className="text-xl opacity-70">Payment Success Rate</p>
                </div>
                <div className="bg-blue-800/50 p-8 rounded-3xl backdrop-blur">
                    <p className="text-5xl font-bold">RWF 4.1B</p>
                    <p className="text-xl opacity-70">Collected Today</p>
                </div>
                <div className="bg-orange-800/50 p-8 rounded-3xl backdrop-blur">
                    <p className="text-5xl font-bold">41,203</p>
                    <p className="text-xl opacity-70">Drone Drops</p>
                </div>
            </div>

            <div className="mt-12 bg-black/50 rounded-3xl p-10">
                <h2 className="text-4xl font-bold mb-8">Live Voice Feed</h2>
                <div className="space-y-6">
                    {liveCalls.map(call => (
                        <div key={call.id} className="bg-purple-900/50 p-6 rounded-2xl flex justify-between items-center">
                            <div>
                                <p className="text-2xl font-bold">{call.customer}</p>
                                <p className="text-lg opacity-70">{call.village} • {call.language}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-green-400">RWF {call.amount.toLocaleString()}</p>
                                <p className="text-xl">{call.status === 'paid' ? 'PAID' : 'Negotiating...'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}