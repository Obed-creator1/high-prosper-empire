// app/dashboard/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard/admin"); // or another default
    }, [router]);

    return <p>Redirecting...</p>;
}
