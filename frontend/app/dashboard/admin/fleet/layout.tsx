// app/(fleet)/layout.tsx — FLEET OS 2026 THEME ONLY
import "./fleet.css"; // ← Your cyberpunk theme
import ClientLayout from "@/app/ClientLayout";

export default function FleetLayout({ children }: { children: React.ReactNode }) {
    return <ClientLayout>{children}</ClientLayout>;
}