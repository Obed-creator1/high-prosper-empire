"use client";

import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cookies from "js-cookie";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const role = Cookies.get("role");

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await api.get(`/notifications/?role=${role}`);
      setNotifications(res.data);
    };
    fetchNotifications();
  }, [role]);

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Notifications</h3>
      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications</p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className="p-2 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {n.message}
          </div>
        ))
      )}
    </div>
  );
}
