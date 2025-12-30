// hooks/useUsersWS.ts
"use client";
import { useEffect, useState } from "react";
import { WSClient } from "@/lib/ws";

export default function useUsersWS() {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL + "/ws/users/";

    useEffect(() => {
        const client = new WSClient(wsUrl);

        client.onMessage((data) => {
            if (data.type === "online_users") {
                setOnlineUsers(data.users);
            }
        });

        return () => client.close();
    }, []);

    return onlineUsers;
}
