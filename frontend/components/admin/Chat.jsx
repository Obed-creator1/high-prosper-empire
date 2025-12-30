"use client";

import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import Cookies from "js-cookie";

let socket;

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const role = Cookies.get("role");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL);
    socket.emit("joinRoom", role);

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit("message", { role, message: input });
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full p-4 border rounded-lg bg-white dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg ${
              m.role === role ? "bg-green-100 dark:bg-green-700 self-end" : "bg-gray-200 dark:bg-gray-700 self-start"
            }`}
          >
            <strong>{m.role}:</strong> {m.message}
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
