// app/customers/[id]/page.tsx — Simple redirect
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CustomerRedirect() {
    const router = useRouter();
    const { id } = useParams();

    useEffect(() => {
        // Open the main customers dashboard and highlight/select customer ID
        router.push(`/dashboard/customer?highlight=${id}`);
    }, [id, router]);

    return <div className="flex items-center justify-center min-h-screen">Loading customer...</div>;
}