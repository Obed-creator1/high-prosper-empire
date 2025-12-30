"use client"
import { createContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const token = Cookies.get("token");

  useEffect(() => {
    if (token) {
      axios.get("http://127.0.0.1:8000/api/auth/me/", {
        headers: { Authorization: `Token ${token}` }
      }).then(res => setUser(res.data))
        .catch(() => Cookies.remove("token"));
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await axios.post("http://127.0.0.1:8000/api/auth/login/", { username, password });
    Cookies.set("token", res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    Cookies.remove("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
