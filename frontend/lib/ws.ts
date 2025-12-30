type WSCallback = (data: any) => void;

export class WSClient {
    private url: string;
    private socket: WebSocket | null = null;
    private callbacks: WSCallback[] = [];
    private reconnectDelay = 2000;
    private shouldReconnect = true;

    constructor(url: string) {
        this.url = url;
        this.connect();
    }

    private connect() {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log(`🔗 Connected → ${this.url}`);
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.callbacks.forEach((cb) => cb(data));
            } catch (e) {
                console.error("WS parse error:", e, event.data);
            }
        };

        this.socket.onclose = () => {
            console.warn(`⚠️ WS closed → ${this.url}`);
            if (this.shouldReconnect) {
                setTimeout(() => this.connect(), this.reconnectDelay);
            }
        };

        this.socket.onerror = (err) => {
            console.error("WS Error:", err);
            this.socket?.close();
        };
    }

    onMessage(callback: WSCallback) {
        this.callbacks.push(callback);
    }

    send(data: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn("WS not open, cannot send:", data);
        }
    }

    close() {
        this.shouldReconnect = false;
        this.socket?.close();
    }
}
