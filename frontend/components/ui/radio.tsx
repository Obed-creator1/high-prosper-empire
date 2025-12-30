import React, { InputHTMLAttributes } from "react";

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = ({ label, className = "", ...props }: RadioProps) => {
  return (
    <label className="flex items-center space-x-2 mb-2">
      <input
        type="radio"
        className={`h-4 w-4 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      />
      {label && <span className="text-gray-700">{label}</span>}
    </label>
  );
};
