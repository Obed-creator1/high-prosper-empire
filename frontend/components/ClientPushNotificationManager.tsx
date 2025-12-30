// components/ClientPushNotificationManager.tsx
"use client";

import dynamic from "next/dynamic";

const PushNotificationManager = dynamic(
    () => import("@/components/PushNotificationManager"),
    { ssr: false }
);

export default function ClientPushNotificationManager() {
    return <PushNotificationManager />;
}
