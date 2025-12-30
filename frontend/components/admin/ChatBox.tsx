"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

type Message = { sender: string; text: string; time: string };

export default function ChatBox({ room }: { room: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001");
    socketRef.current.emit("joinRoom", room);

    socketRef.current.on("message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [room]);

  const sendMessage = () => {
    if (input.trim() === "") return;
    socketRef.current?.emit("message", { sender: "Admin", text: input, time: new Date().toISOString(), room });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full border rounded-lg p-2 bg-white dark:bg-gray-800 shadow-lg">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-1">
            <span className="font-bold">{msg.sender}: </span>
            <span>{msg.text}</span>
            <span className="text-xs text-gray-400 ml-2">{new Date(msg.time).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded-lg px-2 py-1 dark:bg-gray-700 dark:text-white"
          placeholder="Type a message..."
        />
        <button onClick={sendMessage} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
}
