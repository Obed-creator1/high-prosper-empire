// hooks/useDarkMode.ts
import { useEffect, useState } from "react";

export const useDarkMode = () => {
    const [darkMode, setDarkMode] = useState(false);
    useEffect(() => {
        const isDark = localStorage.getItem("darkMode") === "true" ||
            (!localStorage.getItem("darkMode") && window.matchMedia("(prefers-color-scheme: dark)").matches);
        setDarkMode(isDark);
        document.documentElement.classList.toggle("dark", isDark);
    }, []);
    const toggle = () => {
        const newVal = !darkMode;
        setDarkMode(newVal);
        localStorage.setItem("darkMode", String(newVal));
        document.documentElement.classList.toggle("dark", newVal);
    };
    return { darkMode, toggleDarkMode: toggle };
};