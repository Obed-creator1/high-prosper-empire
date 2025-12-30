"use client";
import usePaymentsWS from "@/hooks/usePaymentsWS";

export default function PaymentEvents() {
    const events = usePaymentsWS();

    return (
        <div className="p-4 space-y-2">
            <h3 className="font-semibold">Payment Events</h3>

            {events.map((event, i) => (
                <pre
                    key={i}
                    className="bg-gray-100 text-sm p-3 rounded-lg overflow-auto"
                >
                    {JSON.stringify(event, null, 2)}
                </pre>
            ))}
        </div>
    );
}
