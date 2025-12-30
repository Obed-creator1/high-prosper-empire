// hooks/useDebouncedSearch.ts
import { useState } from "react";
import { useDebounce } from "use-debounce";

export const useDebouncedSearch = (initial = "") => {
    const [value, setValue] = useState(initial);
    const [debounced] = useDebounce(value, 300);
    return { searchTerm: debounced, setSearchTerm: setValue };
};