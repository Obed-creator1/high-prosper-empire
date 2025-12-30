// app/offline/page.tsx — INTELLIGENT OFFLINE PAGE 2026
"use client";

import { useEffect, useState } from "react";

export default function OfflinePage() {
    const [status, setStatus] = useState<"offline" | "reconnecting" | "online">("offline");
    const [lastPath, setLastPath] = useState<string>("/dashboard");

    useEffect(() => {
        // Get last visited path from sessionStorage (set in layout or middleware)
        const savedPath = sessionStorage.getItem("lastPath") || "/dashboard";
        setLastPath(savedPath);

        const checkOnline = async () => {
            try {
                // Simple fetch to API to test real connectivity
                const response = await fetch("/api/health", { method: "HEAD", cache: "no-store" });
                if (response.ok) {
                    setStatus("online");
                    setTimeout(() => {
                        window.location.href = savedPath;
                    }, 2000); // Give time to read message
                } else {
                    setStatus("reconnecting");
                }
            } catch (err) {
                setStatus("reconnecting");
            }
        };

        // Check immediately
        checkOnline();

        // Poll every 5 seconds
        const interval = setInterval(checkOnline, 5000);

        // Also listen to browser online event
        window.addEventListener("online", checkOnline);

        return () => {
            clearInterval(interval);
            window.removeEventListener("online", checkOnline);
        };
    }, []);

    const getStatusMessage = () => {
        switch (status) {
            case "offline":
                return "OFFLINE MODE ENGAGED";
            case "reconnecting":
                return "RECONNECTING TO EMPIRE...";
            case "online":
                return "EMPIRE RESTORED — SYNCING LIVE";
            default:
                return "OFFLINE MODE ENGAGED";
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case "offline":
                return "text-amber-500";
            case "reconnecting":
                return "text-yellow-500";
            case "online":
                return "text-success";
            default:
                return "text-amber-500";
        }
    };

    return (
        <html lang="en" data-theme="dark">
        <head>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>HIGH PROSPER — {status.toUpperCase()}</title>
            <link rel="icon" href="/fleet-icon.svg" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
            <style>{`
          :root {
            --cyan: #00f0ff;
            --purple: #9d00ff;
            --pink: #ff00ff;
            --success: #00ff9d;
            --warning: #ff9500;
            --black: #000000;
            --glow: 0 0 60px;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            min-height: 100vh;
            background: var(--black);
            color: var(--cyan);
            font-family: 'Orbitron', 'Courier New', monospace;
            overflow: hidden;
            display: grid;
            place-items: center;
            position: relative;
          }

          .bg-grid {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(var(--cyan) 1px, transparent 1px),
              linear-gradient(90deg, var(--cyan) 1px, transparent 1px);
            background-size: 80px 80px;
            opacity: 0.07;
            animation: grid-flow 40s linear infinite;
          }

          @keyframes grid-flow {
            0% { transform: translate(0, 0); }
            100% { transform: translate(80px, 80px); }
          }

          .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--cyan);
            border-radius: 50%;
            opacity: 0.6;
            animation: float 20s infinite linear;
          }

          @keyframes float {
            0% { transform: translateY(100vh) translateX(0); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(-100px) translateX(100px); opacity: 0; }
          }

          .core {
            position: absolute;
            width: 400px;
            height: 400px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0,240,255,0.2) 0%, transparent 70%);
            box-shadow: var(--glow) var(--cyan);
            animation: pulse-core 6s ease-in-out infinite;
          }

          @keyframes pulse-core {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.3); opacity: 0.8; }
          }

          .container {
            z-index: 10;
            text-align: center;
            padding: 2rem;
            max-width: 90%;
          }

          .logo {
            font-size: clamp(6rem, 15vw, 12rem);
            font-weight: 900;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, var(--cyan), var(--purple), var(--pink));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-shadow: var(--glow) var(--cyan);
            animation: neon-flicker 4s infinite;
          }

          @keyframes neon-flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.9; }
            75% { opacity: 0.95; }
          }

          h1 {
            font-size: clamp(2.5rem, 8vw, 5rem);
            font-weight: 900;
            margin: 2rem 0;
            letter-spacing: 0.5rem;
            background: linear-gradient(90deg, var(--cyan), var(--purple), var(--pink), var(--cyan));
            background-size: 200% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: rainbow-shift 8s linear infinite;
          }

          @keyframes rainbow-shift {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }

          .subtitle {
            font-size: clamp(1.8rem, 5vw, 3rem);
            margin: 2rem 0;
            font-weight: bold;
            text-shadow: 0 0 30px currentColor;
            transition: color 1s ease;
          }

          .message {
            font-size: clamp(1.1rem, 3vw, 1.5rem);
            line-height: 1.8;
            max-width: 800px;
            margin: 3rem auto;
            opacity: 0.9;
          }

          .message strong {
            color: var(--success);
            font-weight: 900;
          }

          .status {
            margin-top: 4rem;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
          }

          .status-item {
            display: flex;
            align-items: center;
            gap: 0.8rem;
          }

          .dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 20px currentColor;
            animation: pulse-dot 2s infinite;
          }

          @keyframes pulse-dot {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.3); }
          }

          .dot.success { background: var(--success); color: var(--success); }
          .dot.warning { background: var(--warning); color: var(--warning); }
          .dot.reconnecting { background: var(--warning); color: var(--warning); animation: pulse-dot 1s infinite; }
        `}</style>
        </head>
        <body>
        <div className="bg-grid"></div>
        <div className="core"></div>

        {/* Floating Particles */}
        {Array.from({ length: 30 }).map((_, i) => (
            <div
                key={i}
                className="particle"
                style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 20}s`,
                    animationDuration: `${15 + Math.random() * 15}s`,
                }}
            />
        ))}

        <div className="container">
            <div className="logo">EMPIRE</div>
            <h1>HIGH PROSPER 2026</h1>
            <div className={`subtitle ${getStatusColor()}`}>
                {getStatusMessage()}
            </div>

            <div className="message">
                <p>Your entire business empire is operating in <strong>local stealth mode</strong>.</p>
                <p>
                    <strong>Fleet Tracking • Inventory • HR • Payments • Customers • Analytics</strong>
                    <br />
                    All systems fully functional with cached data.
                </p>
                {status === "offline" && (
                    <p>Real-time sync paused. All changes are queued securely.</p>
                )}
                {status === "reconnecting" && (
                    <p>Attempting to restore connection to central command...</p>
                )}
                {status === "online" && (
                    <p>
                        <strong>Live operations resuming in 2 seconds...</strong>
                    </p>
                )}
                <p>
                    <strong>Reconnect anytime to resume full empire synchronization.</strong>
                </p>
            </div>

            <div className="status">
                <div className="status-item">
                    <span className={`dot ${status === "online" ? "success" : status === "reconnecting" ? "reconnecting" : "warning"}`}></span>
                    <span>{status === "online" ? "Live Sync Active" : "Local Cache Active"}</span>
                </div>
                <div className="status-item">
                    <span className="dot warning"></span>
                    <span>Sync {status === "online" ? "Complete" : "Pending"} ({new Date().toLocaleTimeString()})</span>
                </div>
            </div>
        </div>
        </body>
        </html>
    );
}