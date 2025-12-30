// components/dashboard/NeuralTransaction.tsx
"use client";

import { useState } from "react";
import { FiSend, FiZap } from "react-icons/fi";  // ✅ FiBrain → FiZap (exists in react-icons/fi)

export default function NeuralTransaction() {
    const [input, setInput] = useState("");
    const [entries, setEntries] = useState<string[]>([]);

    const processCommand = () => {
        const cmd = input.toLowerCase();
        let entry = "";

        if (cmd.includes("paid") && cmd.includes("salary")) {
            entry = `DEBIT: Salaries Expense | CREDIT: Cash | Amount: RWF 12,400,000 | AI: "Monthly payroll executed. Morale stable."`;
        } else if (cmd.includes("received") && cmd.includes("client")) {
            entry = `DEBIT: Cash | CREDIT: Service Revenue | Amount: RWF 8,750,000 | AI: "Client consciousness aligned. Funds secured."`;
        } else {
            entry = `AI: "Pattern recognized. Journal entry generated." | ${input}`;
        }

        setEntries([entry, ...entries]);
        setInput("");
    };

    return (
        <div className="bg-black/80 backdrop-blur-2xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <FiZap className="text-cyan-400 animate-pulse" />  {/* ✅ FiZap for Neural Spark */}
                NEURAL TRANSACTION ENTRY
            </h3>

            <div className="flex gap-4 mb-6">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && processCommand()}
                    placeholder="Speak or type: 'Paid salary to team'..."
                    className="flex-1 px-6 py-4 bg-white/10 border border-purple-500/40 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/30 transition-all font-mono"
                />
                <button
                    onClick={processCommand}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl hover:scale-105 transition-all shadow-2xl hover:shadow-cyan-500/50"
                >
                    <FiSend className="w-6 h-6" />
                </button>
            </div>

            <div className="space-y-4 font-mono text-sm max-h-96 overflow-y-auto">
                {entries.map((e, i) => (
                    <div key={i} className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl animate-fadeIn">
                        {e}
                    </div>
                ))}
                {entries.length === 0 && (
                    <p className="text-center text-gray-500 italic font-mono">Awaiting neural command...</p>
                )}
            </div>
        </div>
    );
}