// hooks/useCommandBar.ts
import { useState } from "react";

export const useCommandBar = () => {
    const [open, setOpen] = useState(false);
    return { commandBarOpen: open, toggleCommandBar: () => setOpen(o => !o) };
};