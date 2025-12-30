// components/ChartPlaceholder.tsx
import React from "react";

type Props = {
  title: string;
};

const ChartPlaceholder: React.FC<Props> = ({ title }) => {
  return (
    <div className="bg-white p-4 rounded shadow text-center h-64 flex items-center justify-center">
      <p className="text-gray-400">{title} (Chart goes here)</p>
    </div>
  );
};

export default ChartPlaceholder; // ✅ default export
