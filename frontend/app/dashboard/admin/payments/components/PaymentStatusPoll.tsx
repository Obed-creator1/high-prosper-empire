"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type PaymentStatusPollProps = {
    paymentId: number;
};

export default function PaymentStatusPoll({ paymentId }: PaymentStatusPollProps) {
    const [status, setStatus] = useState<string>("Pending");
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/payments/${paymentId}/`);
                setStatus(res.data.status);
                if (res.data.status === "Paid" || res.data.status === "Failed") {
                    clearInterval(interval);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error polling payment:", err);
                clearInterval(interval);
                setLoading(false);
            }
        }, 5000); // poll every 5 seconds

        return () => clearInterval(interval);
    }, [paymentId]);

    return (
        <div>
            <h3>Payment Status: {status}</h3>
            {loading && <p>Checking payment confirmation...</p>}
        </div>
    );
}
