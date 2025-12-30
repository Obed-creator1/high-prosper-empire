// hooks/usePaymentsWS.ts
"use client";
import { useEffect, useState } from "react";
import { WSClient } from "@/lib/ws";

export default function usePaymentsWS() {
    const [paymentEvents, setPaymentEvents] = useState<any[]>([]);
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL + "/ws/payments/";

    useEffect(() => {
        const client = new WSClient(wsUrl);

        client.onMessage((data) => {
            setPaymentEvents((prev) => [data, ...prev]);
        });

        return () => client.close();
    }, []);

    return paymentEvents;
}
