"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";

type User = {
  id: number;
  username: string;
  role: string;
};

export default function Page() {
  const [users, setUsers] = useState<User[]>([]);
  const token = Cookies.get("access");

  useEffect(() => {
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error(err));
  }, [token]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id} className="mb-2">
            <Link
              href={`/dashboard/chat/${user.id}`}
              className="text-blue-600 hover:underline"
            >
              {user.username} ({user.role})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
