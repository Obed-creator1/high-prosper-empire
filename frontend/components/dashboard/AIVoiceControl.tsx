// components/dashboard/AIVoiceControl.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { FiMic, FiMicOff, FiZap } from "react-icons/fi";

export default function AIVoiceControl() {
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [response, setResponse] = useState("");
    const recognitionRef = useRef<any>(null);

    const aiResponses = {
        "show revenue": "Displaying Q4 revenue trajectory. Empire growth: +237% YoY.",
        "create invoice": "Neural invoice generator activated. State amount and client.",
        "predict cash flow": "Running quantum forecasting model... Crisis averted in 11 days.",
        "lock system": "Initiating total lockdown. Only CEO consciousness accepted.",
        "hello prosper": "I am awake. The empire breathes through me.",
    };

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) return;

        recognitionRef.current = new (window as any).webkitSpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
            const last = event.results[event.results.length - 1];
            const text = last[0].transcript.toLowerCase();
            setTranscript(text);

            // AI Command Recognition
            Object.keys(aiResponses).forEach(cmd => {
                if (text.includes(cmd)) {
                    setResponse(aiResponses[cmd as keyof typeof aiResponses]);
                    speak(aiResponses[cmd as keyof typeof aiResponses]);
                }
            });
        };

        if (listening) recognitionRef.current.start();
        else recognitionRef.current.stop();

        return () => recognitionRef.current?.stop();
    }, [listening]);

    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = speechSynthesis.getVoices().find(v => v.name.includes("Google UK English Female") || v.name.includes("Karen")) || null;
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        speechSynthesis.speak(utterance);
    };

    return (
        <div className="fixed left-1/2 top-8 -translate-x-1/2 z-50">
            <div className="bg-black/90 backdrop-blur-2xl border border-cyan-500/50 rounded-full px-8 py-4 shadow-2xl flex items-center gap-6">
                <button
                    onClick={() => setListening(!listening)}
                    className={`p-4 rounded-full transition-all ${listening ? "bg-red-600 animate-pulse" : "bg-cyan-600 hover:bg-cyan-500"}`}
                >
                    {listening ? <FiMicOff size={28} /> : <FiMic size={28} />}
                </button>

                <div className="text-left">
                    <div className="text-cyan-400 font-mono text-sm">VOICE COMMAND ACTIVE</div>
                    <div className="text-white font-bold text-lg">{listening ? "Listening..." : "Say: 'Hello Prosper'"}</div>
                </div>

                {transcript && (
                    <div className="text-purple-400 font-mono animate-pulse">
                        &gt; {transcript}
                    </div>
                )}

                {response && (
                    <div className="ml-6 p-4 bg-purple-900/50 rounded-xl border border-purple-500/50">
                        <FiZap className="inline mr-2 text-yellow-400" />
                        <span className="text-purple-300 font-mono">{response}</span>
                    </div>
                )}
            </div>
        </div>
    );
}