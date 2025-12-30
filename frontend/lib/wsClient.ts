"use client";

import Cookies from "js-cookie";

export type WSMessageHandler = (data: any) => void;

export class WSClient {
    private socket: WebSocket | null = null;
    private url: string;
    private handlers: WSMessageHandler[] = [];
    private reconnectInterval = 5000; // 5 seconds
    private shouldReconnect = true;

    constructor(path: string) {
        const token = Cookies.get("token");
        const protocol = location.protocol === "https:" ? "wss" : "ws";
        const host = location.host;

        this.url = `${protocol}://${host}${path}${token ? `?token=${token}` : ""}`;
        this.connect();
    }

    private connect() {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => console.log("WS Connected:", this.url);
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handlers.forEach((handler) => handler(data));
            } catch (err) {
                console.error("WS parse error:", err);
            }
        };
        this.socket.onerror = (err) => {
            console.error("WS Error:", err);
            this.socket?.close();
        };
        this.socket.onclose = (e) => {
            console.warn("WS Closed:", e.reason);
            if (this.shouldReconnect) {
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };
    }

    send(data: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn("WS not open, cannot send");
        }
    }

    addHandler(handler: WSMessageHandler) {
        this.handlers.push(handler);
    }

    removeHandler(handler: WSMessageHandler) {
        this.handlers = this.handlers.filter((h) => h !== handler);
    }

    close() {
        this.shouldReconnect = false;
        this.socket?.close();
    }
}
