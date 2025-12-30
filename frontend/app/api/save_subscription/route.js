import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const subscription = await req.json();

        // Your Django backend URL
        const backendUrl = process.env.NEXT_PUBLIC_API_URL + "webpush/save_information/";

        // Forward subscription to Django
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(subscription),
            credentials: "include", // include cookies for authentication
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("❌ Django response error:", errorData);
            return NextResponse.json(
                { error: "Failed to save subscription in Django", details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log("✅ Subscription saved successfully:", data);
        return NextResponse.json({ message: "Subscription saved successfully", data });
    } catch (err) {
        console.error("❌ Error saving subscription:", err);
        return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }
}
