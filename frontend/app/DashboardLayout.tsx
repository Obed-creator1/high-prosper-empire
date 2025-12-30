// app/DashboardLayout.tsx
import ClientDashboardWrapper from "./ClientDashboardWrapper";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <ClientDashboardWrapper>{children}</ClientDashboardWrapper>;
}