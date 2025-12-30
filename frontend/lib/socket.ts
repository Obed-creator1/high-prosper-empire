const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/vehicle-tracking/";

const socket = new WebSocket(WS_URL);

socket.onopen = () => {
    console.log("WebSocket connected");
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Received vehicle data:", data);
};

socket.onclose = () => {
    console.log("WebSocket disconnected");
};

export default socket;
