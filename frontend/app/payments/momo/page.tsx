"use client";

import { useState } from "react";

export default function MTNMomo() {
  const [phone, setPhone] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Mock API call
    setStatus(`Processing payment of ${amount} RWF to ${phone}...`);
    setTimeout(() => {
      setStatus(`Payment of ${amount} RWF to ${phone} successful!`);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <form
        onSubmit={handlePayment}
        className="bg-white p-6 rounded-xl shadow-md w-80 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center">MTN MoMo Payment</h1>
        <input
          type="text"
          placeholder="Phone number"
          className="w-full p-2 border rounded"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="number"
          placeholder="Amount"
          className="w-full p-2 border rounded"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Pay
        </button>
        {status && <p className="text-blue-600 mt-2">{status}</p>}
      </form>
    </div>
  );
}
